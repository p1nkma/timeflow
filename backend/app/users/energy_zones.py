"""Energy zones for a user's day.

Model: adapted from Daniel Pink's "When" (Peak / Trough / Recovery) + ночной dip.

  kind:
    peak     — пик аналитической мощности (планирование, сложные задачи)
    recovery — креатив, лёгкая аналитика, брейнсторм
    trough   — спад, рутина, админ
    dip      — ночь / раннее утро / поздний вечер: восстановление

Cold-start: расставляется по хронотипу.
History-aware: если есть ≥10 завершённых задач за 14 дней, корректируем peak/trough
по реальным best_hours / worst_hours пользователя.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import TaskStatus
from app.tasks.models import Task

ZoneKind = Literal["peak", "recovery", "trough", "dip"]

# Жёсткий буфер: задача считается выполненной "вовремя" если completed_at не позже
# planned_end_at + 30 минут. Сделано позже — слот зачитывается как провал, чтобы
# не завышать продуктивность планируемых часов и прививать дисциплину расписания.
ON_TIME_BUFFER_MIN = 30

# Chronotype → list of (start_hour, end_hour, kind).
# Часы локальные. Покрытие 24 часов с непрерывными границами.
CHRONO_PRESETS: dict[str, list[tuple[int, int, ZoneKind]]] = {
    # Жаворонок: ранний пик, ранний спад, recovery после 16, ночь рано
    "lark": [
        (0, 6,   "dip"),
        (6, 11,  "peak"),
        (11, 13, "recovery"),  # лёгкий буфер
        (13, 16, "trough"),
        (16, 19, "recovery"),
        (19, 24, "dip"),
    ],
    # Голубь: классический «3 фазы», пик днём, trough — обед, вечерний recovery
    "pigeon": [
        (0, 7,   "dip"),
        (7, 12,  "peak"),
        (12, 14, "trough"),
        (14, 17, "recovery"),
        (17, 20, "trough"),
        (20, 24, "dip"),
    ],
    # Сова: утром recovery, trough к обеду, пик во вторую половину дня и вечер
    "owl": [
        (0, 8,   "dip"),
        (8, 12,  "recovery"),
        (12, 14, "trough"),
        (14, 20, "peak"),
        (20, 23, "recovery"),
        (23, 24, "dip"),
    ],
}


@dataclass
class EnergyZone:
    start_min: int      # минуты от полуночи (локальное время)
    end_min: int
    kind: ZoneKind
    source: Literal["chronotype", "history"]


def _preset_for(chronotype: str) -> list[tuple[int, int, ZoneKind]]:
    return CHRONO_PRESETS.get(chronotype, CHRONO_PRESETS["pigeon"])


def _to_zones(preset: list[tuple[int, int, ZoneKind]], source: str) -> list[EnergyZone]:
    return [
        EnergyZone(start_min=s * 60, end_min=e * 60, kind=k, source=source)  # type: ignore[arg-type]
    for s, e, k in preset
    ]


async def compute_energy_zones(
    db: AsyncSession,
    user_id,
    chronotype: str,
    utc_offset_min: int,
) -> list[EnergyZone]:
    """Возвращает массив энергозон на 24 часа локального времени пользователя.

    Алгоритм:
      1. Берём пресет по хронотипу как базу.
      2. Считаем completion-rate по часам за 14 дней (если задач ≥ 10).
      3. Берём топ-2 часа с completion ≥60% → форсим их в peak.
         Берём worst-2 часа с completion ≤30% и ≥3 sample → форсим их в trough.
      4. Возвращаем непрерывное покрытие 0–24, мерджа соседние одинаковые блоки.
    """
    base = _preset_for(chronotype)

    # Сначала собираем "hourly map" по пресету
    hour_kind: dict[int, ZoneKind] = {}
    hour_source: dict[int, str] = {}
    for s, e, k in base:
        for h in range(s, e):
            hour_kind[h] = k
            hour_source[h] = "chronotype"

    # ── История за 14 дней ─────────────────────────────────────────
    tz_delta = timedelta(minutes=utc_offset_min)
    start = datetime.now(UTC) - timedelta(days=14)
    rows = await db.execute(
        select(Task).where(
            Task.user_id == user_id,
            Task.planned_start_at >= start,
            Task.planned_start_at.is_not(None),
            Task.is_break.is_(False),
        )
    )
    tasks = list(rows.scalars().all())

    if len(tasks) >= 10:
        hourly: dict[int, dict[str, int]] = {}
        buffer = timedelta(minutes=ON_TIME_BUFFER_MIN)
        for t in tasks:
            if not t.planned_start_at:
                continue
            local = (t.planned_start_at.astimezone(UTC) + tz_delta).replace(tzinfo=None)
            h = local.hour
            d = hourly.setdefault(h, {"total": 0, "done": 0})
            d["total"] += 1
            # "Сделано вовремя": completed_at в пределах planned_end_at + 30 мин.
            done_on_time = (
                t.status == TaskStatus.done
                and t.completed_at is not None
                and t.planned_end_at is not None
                and t.completed_at <= t.planned_end_at + buffer
            )
            if done_on_time:
                d["done"] += 1

        # Топ-часы по completion (≥3 sample, ≥60%) → форсим в peak (но не трогаем dip-ночь)
        best = sorted(
            [(h, d["done"] / d["total"], d["total"]) for h, d in hourly.items()
             if d["total"] >= 3 and d["done"] / d["total"] >= 0.6],
            key=lambda x: (-x[1], -x[2]),
        )[:3]
        for h, _, _ in best:
            if hour_kind.get(h) == "dip":
                continue  # ночь не трогаем — это здоровье, а не статистика
            hour_kind[h] = "peak"
            hour_source[h] = "history"

        # Худшие часы (≥3 sample, ≤30%) → trough (но не dip)
        worst = sorted(
            [(h, d["done"] / d["total"], d["total"]) for h, d in hourly.items()
             if d["total"] >= 3 and d["done"] / d["total"] <= 0.3],
            key=lambda x: (x[1], -x[2]),
        )[:2]
        for h, _, _ in worst:
            if hour_kind.get(h) == "dip":
                continue
            hour_kind[h] = "trough"
            hour_source[h] = "history"

    # ── Merge соседних часов одного kind ──────────────────────────
    zones: list[EnergyZone] = []
    cur_start = 0
    cur_kind = hour_kind.get(0, "dip")
    cur_source = hour_source.get(0, "chronotype")
    for h in range(1, 24):
        k = hour_kind.get(h, "dip")
        s = hour_source.get(h, "chronotype")
        if k != cur_kind:
            zones.append(EnergyZone(
                start_min=cur_start * 60,
                end_min=h * 60,
                kind=cur_kind,  # type: ignore[arg-type]
                source=cur_source,  # type: ignore[arg-type]
            ))
            cur_start = h
            cur_kind = k
            cur_source = s
        else:
            # Если в одном merged-блоке смешались chronotype+history — приоритет history
            if s == "history":
                cur_source = "history"
    # Закрываем последний блок
    zones.append(EnergyZone(
        start_min=cur_start * 60,
        end_min=24 * 60,
        kind=cur_kind,  # type: ignore[arg-type]
        source=cur_source,  # type: ignore[arg-type]
    ))

    return zones
