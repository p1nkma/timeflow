from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.ai.client import chat
from app.categories.models import Category
from app.core.deps import CurrentUser, DbSession
from app.core.enums import TaskSource, TaskStatus
from app.tasks.models import Task
from app.tasks.schemas import TaskOut

router = APIRouter(prefix="/ai", tags=["ai"])

# Simple in-memory cache for the daily tip (resets on server restart)
_tip_cache: dict[str, str] = {}


def _window(days: int) -> tuple[datetime, datetime]:
    now = datetime.now(UTC)
    return now - timedelta(days=days), now


class PlanRequest(BaseModel):
    date: str  # ISO date YYYY-MM-DD to plan for
    duration_overrides: dict[uuid.UUID, int] | None = None  # task_id → minutes (user picks)


class AskRequest(BaseModel):
    question: str
    days: int = 7  # period context: 7 / 30 / 90


class EstimateDurationsRequest(BaseModel):
    task_ids: list[uuid.UUID] = Field(min_length=1, max_length=30)


class DurationEstimate(BaseModel):
    task_id: uuid.UUID
    minutes: int
    based_on: str  # human-readable rationale, e.g. "12 похожих задач в 'Учёба'"


class EstimateDurationsResponse(BaseModel):
    estimates: list[DurationEstimate]


# Energy → default duration (fallback when no history)
ENERGY_DEFAULT_MINUTES = {
    "high":   90,
    "medium": 60,
    "low":    30,
}
NO_ENERGY_DEFAULT = 45

# Hard 30-min buffer for "done on time" — privilege schedule discipline
ON_TIME_BUFFER = timedelta(minutes=30)


def _done_on_time(t: Task) -> bool:
    """True если задача закрыта в пределах planned_end_at + 30 мин.
    Тот же критерий используем везде где считаем productivity hours.
    """
    return (
        t.status == TaskStatus.done
        and t.completed_at is not None
        and t.planned_end_at is not None
        and t.completed_at <= t.planned_end_at + ON_TIME_BUFFER
    )


WEEKDAY_RU = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"]
CHRONOTYPE_HINTS = {
    "lark":   "жаворонок — пик концентрации 6–11, спад после 15",
    "pigeon": "голубь — устойчивая продуктивность 9–15, небольшой спад после 17",
    "owl":    "сова — пик концентрации 13–20, утро менее продуктивно",
}


def _mins_to_hhmm(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def _to_local(dt: datetime, tz_delta: timedelta) -> datetime:
    """Convert UTC-aware datetime to user-local (naive) representation."""
    return (dt.astimezone(UTC) + tz_delta).replace(tzinfo=None)


@router.post("/plan", response_model=list[TaskOut])
async def generate_plan(payload: PlanRequest, user: CurrentUser, db: DbSession) -> list[Task]:
    """Расставляет задачи из инбокса на конкретный день, опираясь на:
    - рабочее окно и хронотип пользователя;
    - реальную статистику продуктивности по часам/категориям за 14 дней;
    - уже занятые слоты на этот день;
    - дедлайны, urgent, energy задач.
    """
    try:
        plan_date = datetime.fromisoformat(payload.date).date()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format") from exc

    tz_delta = timedelta(minutes=user.utc_offset)
    utc_offset_str = f"{'+' if user.utc_offset >= 0 else '-'}{abs(user.utc_offset) // 60:02d}:{abs(user.utc_offset) % 60:02d}"

    # Local day boundaries (converted to UTC for DB queries)
    local_midnight_utc = datetime(plan_date.year, plan_date.month, plan_date.day, tzinfo=UTC) - tz_delta
    day_start = local_midnight_utc
    day_end = day_start + timedelta(days=1)

    now_utc = datetime.now(UTC)
    now_local = _to_local(now_utc, tz_delta)
    is_today = plan_date == now_local.date()

    work_start_str = _mins_to_hhmm(user.work_start)
    work_end_str   = _mins_to_hhmm(user.work_end)

    # ── 1. Inbox: prioritize by (urgent, deadline asc, created_at) ───────
    inbox_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at.is_(None),
            Task.status == TaskStatus.pending,
        ).order_by(
            Task.urgent.desc(),
            Task.deadline.asc().nulls_last(),
            Task.created_at,
        ).limit(20)
    )
    inbox_tasks = inbox_rows.scalars().all()

    if not inbox_tasks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inbox is empty — nothing to schedule",
        )

    # ── 2. Already-occupied slots on the target day ──────────────────────
    busy_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= day_start,
            Task.planned_start_at < day_end,
        ).order_by(Task.planned_start_at)
    )
    busy_tasks = busy_rows.scalars().all()

    # ── 3. Categories ────────────────────────────────────────────────────
    cat_rows = await db.execute(
        select(Category.id, Category.key, Category.name).where(Category.user_id == user.id)
    )
    cats = {str(r.id): {"key": r.key, "name": r.name} for r in cat_rows}

    # ── 4. Productivity profile (last 14 days, only past tasks) ──────────
    profile_start = now_utc - timedelta(days=14)
    profile_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= profile_start,
            Task.planned_start_at < now_utc,
            Task.planned_start_at.is_not(None),
        )
    )
    profile_tasks = profile_rows.scalars().all()

    # Hourly completion rate (local hour)
    hourly: dict[int, dict] = {}
    # Per-category × hour
    cat_hour: dict[str, dict[int, dict]] = {}
    # Per-category completion rate
    cat_rate: dict[str, dict] = {}

    for t in profile_tasks:
        if not t.planned_start_at:
            continue
        h = _to_local(t.planned_start_at, tz_delta).hour
        # "Done" в profile = выполнено в пределах planned_end + 30мин.
        # Опоздание сильно карается — слот зачитывается как провал.
        done = _done_on_time(t)

        hourly.setdefault(h, {"total": 0, "done": 0})
        hourly[h]["total"] += 1
        if done:
            hourly[h]["done"] += 1

        if t.category_id:
            cat_name = cats.get(str(t.category_id), {}).get("name", "—")
            cat_rate.setdefault(cat_name, {"total": 0, "done": 0})
            cat_rate[cat_name]["total"] += 1
            if done:
                cat_rate[cat_name]["done"] += 1

            cat_hour.setdefault(cat_name, {})
            cat_hour[cat_name].setdefault(h, {"total": 0, "done": 0})
            cat_hour[cat_name][h]["total"] += 1
            if done:
                cat_hour[cat_name][h]["done"] += 1

    # Best hours: require ≥2 tasks, completion ≥50%
    best_hours = sorted(
        [(h, d["done"] / d["total"], d["total"]) for h, d in hourly.items() if d["total"] >= 2],
        key=lambda x: (-x[1], -x[2]),
    )[:5]
    productivity_profile = (
        ", ".join(f"{h:02d}:00–{h+1:02d}:00 ({round(r*100)}%, n={n})" for h, r, n in best_hours)
        if best_hours else "недостаточно данных — опирайся на хронотип"
    )

    # Worst hours: completion <40% with ≥2 tasks (where NOT to put heavy tasks)
    worst_hours = sorted(
        [(h, d["done"] / d["total"], d["total"]) for h, d in hourly.items()
         if d["total"] >= 2 and d["done"] / d["total"] < 0.4],
        key=lambda x: (x[1], -x[2]),
    )[:3]
    worst_str = (
        ", ".join(f"{h:02d}:00–{h+1:02d}:00 ({round(r*100)}%, n={n})" for h, r, n in worst_hours)
        if worst_hours else "—"
    )

    # Per-category best hour
    cat_best_hour: dict[str, str] = {}
    for name, hours in cat_hour.items():
        ranked = sorted(
            [(h, d["done"] / d["total"], d["total"]) for h, d in hours.items() if d["total"] >= 2],
            key=lambda x: (-x[1], -x[2]),
        )
        if ranked:
            h, r, n = ranked[0]
            cat_best_hour[name] = f"{h:02d}:00 ({round(r*100)}%, n={n})"

    cat_completion: dict[str, str] = {
        name: f"{round(d['done'] / d['total'] * 100)}% (n={d['total']})"
        for name, d in cat_rate.items() if d["total"] >= 2
    }

    chronotype_hint = CHRONOTYPE_HINTS.get(str(user.chronotype), str(user.chronotype))
    weekday_ru = WEEKDAY_RU[plan_date.weekday()]

    # ── 5. Build LLM payload ──────────────────────────────────────────────
    def _days_until(deadline: datetime | None) -> int | None:
        if deadline is None:
            return None
        return (deadline.date() - plan_date).days

    overrides = payload.duration_overrides or {}

    def _fmt_inbox(t: Task) -> dict:
        cat_name = cats.get(str(t.category_id), {}).get("name") if t.category_id else None
        # Priority: user override > stored estimate > null (LLM picks)
        fixed_duration = overrides.get(t.id) or t.estimated_duration_minutes
        return {
            "id": str(t.id),
            "title": t.title,
            "category": cat_name,
            "energy": t.energy.value if t.energy else None,
            "urgent": t.urgent,
            "deadline": t.deadline.date().isoformat() if t.deadline else None,
            "days_until_deadline": _days_until(t.deadline),
            "is_recurring": t.is_recurring,
            "notes": (t.notes[:120] if t.notes else None),
            "fixed_duration_minutes": fixed_duration,
        }

    def _fmt_busy(t: Task) -> dict:
        return {
            "title": t.title,
            "start": _to_local(t.planned_start_at, tz_delta).strftime("%H:%M") if t.planned_start_at else "?",
            "end":   _to_local(t.planned_end_at,   tz_delta).strftime("%H:%M") if t.planned_end_at else "?",
            "locked": bool(t.locked),
            "category": cats.get(str(t.category_id), {}).get("name") if t.category_id else None,
        }

    # Earliest legal start time (work_start, OR now if planning today)
    earliest_start_min = user.work_start
    if is_today:
        now_min = now_local.hour * 60 + now_local.minute
        earliest_start_min = max(earliest_start_min, now_min)
    earliest_start_str = _mins_to_hhmm(earliest_start_min)

    system_prompt = (
        "Ты AI-планировщик в приложении тайм-менеджмента TimeFlow. "
        "Твоя задача — расставить задачи из инбокса по свободным слотам конкретного дня так, "
        "чтобы пользователь реально их закрыл.\n\n"

        "═══ ПРИОРИТЕТЫ ПРАВИЛ (от высшего к низшему) ═══\n"
        "P0. Никогда не пересекай busy_slots и не выходи за work_window и earliest_start.\n"
        "P1. urgent=true И/ИЛИ deadline ≤ 1 день — ставить в первую половину рабочего окна.\n"
        "P2. high energy + срочное → в самый продуктивный час из real_best_hours.\n"
        "P3. high energy без срочности → в продуктивные часы (real_best_hours), "
        "     иначе fallback на хронотип.\n"
        "P4. low energy / рутина → в worst_hours или в конец рабочего окна.\n"
        "P5. Категорию ставь в её исторически лучший час (cat_best_hour), если он не занят.\n"
        "P6. Между задачами 5–10 мин буфер; после 90 мин непрерывной работы — 15 мин перерыв "
        "     (перерывы НЕ добавляй в ответ — это только для расчёта).\n\n"

        "═══ ДЛИТЕЛЬНОСТЬ ═══\n"
        "ПРАВИЛО ВЫСШЕГО ПРИОРИТЕТА: если у задачи задано fixed_duration_minutes (не null) — "
        "используй РОВНО это число минут. Не округляй, не увеличивай, не уменьшай.\n\n"
        "Если fixed_duration_minutes = null — назначь по эвристике:\n"
        "  • high energy: 90 мин\n"
        "  • medium energy: 60 мин\n"
        "  • low energy / без energy: 30 мин\n"
        "  • срочные с дедлайном сегодня: не больше 60 мин\n\n"

        "═══ ОБРАБОТКА КОНФЛИКТОВ ═══\n"
        "Если все продуктивные слоты заняты — двигай задачу в ближайший свободный слот, "
        "сохраняя P1. Если задача физически не влезает в рабочее окно — НЕ включай её в ответ "
        "(пользователь увидит что она осталась в инбоксе).\n\n"

        "═══ REASON ═══\n"
        "Для каждой задачи дай ДВА поля:\n"
        "  • reason — 1 короткая фраза (до 60 символов), почему этот слот. Видно на карточке.\n"
        "  • reason_long — 2–3 предложения, развёрнутое обоснование с цифрами из статистики "
        "    (например: 'в 10:00 у тебя 85% completion за 14 дней — лучший слот для high energy'). "
        "    Показывается при клике.\n\n"

        "═══ ФОРМАТ ОТВЕТА ═══\n"
        "Строго JSON-массив, без markdown, без префиксов, без комментариев:\n"
        '[{"id":"<uuid задачи из inbox>",'
        '"planned_start_at":"YYYY-MM-DDTHH:MM:SS<offset>",'
        '"planned_end_at":"YYYY-MM-DDTHH:MM:SS<offset>",'
        '"reason":"<≤60 символов>",'
        '"reason_long":"<2-3 предложения>"}]\n'
        "Все ISO-даты — в локальной таймзоне пользователя с UTC offset. "
        "Включай только задачи, которым нашёл место. Без пояснений вне JSON."
    )

    payload_obj = {
        "plan_date": payload.date,
        "weekday": weekday_ru,
        "is_today": is_today,
        "now_local": now_local.strftime("%H:%M") if is_today else None,
        "earliest_start": earliest_start_str,
        "work_window": {"start": work_start_str, "end": work_end_str},
        "user_timezone": f"UTC{utc_offset_str}",
        "user_profile": {
            "chronotype": chronotype_hint,
            "real_best_hours": productivity_profile,
            "worst_hours": worst_str,
            "category_best_hour": cat_best_hour or "—",
            "category_completion_rate": cat_completion or "—",
        },
        "busy_slots": [_fmt_busy(t) for t in busy_tasks],
        "inbox": [_fmt_inbox(t) for t in inbox_tasks],
    }

    user_msg = json.dumps(payload_obj, ensure_ascii=False, indent=2)

    try:
        raw = await chat(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}],
            temperature=0.2,
            max_tokens=2500,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}") from e

    # Parse JSON (handle markdown code blocks)
    content = raw.strip()
    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    try:
        slots: list[dict] = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned invalid JSON") from exc

    # ── 6. Validate & persist ─────────────────────────────────────────────
    task_map = {str(t.id): t for t in inbox_tasks}
    busy_intervals = [
        (t.planned_start_at, t.planned_end_at) for t in busy_tasks
        if t.planned_start_at and t.planned_end_at
    ]
    updated: list[Task] = []

    for slot in slots:
        task_id = slot.get("id")
        if task_id not in task_map:
            continue
        task = task_map[task_id]
        try:
            start = datetime.fromisoformat(slot["planned_start_at"])
            end   = datetime.fromisoformat(slot["planned_end_at"])
        except (KeyError, ValueError, TypeError):
            continue
        if end <= start:
            continue
        # Reject overlaps with existing busy slots
        if any(start < b_end and end > b_start for b_start, b_end in busy_intervals):
            continue
        task.planned_start_at = start
        task.planned_end_at = end
        # Persist the picked duration so we don't re-ask next time
        duration_min = int((end - start).total_seconds() / 60)
        if duration_min > 0:
            task.estimated_duration_minutes = duration_min
        task.reason = (slot.get("reason") or "")[:255] or None
        task.reason_long = slot.get("reason_long") or None
        task.source = TaskSource.ai
        busy_intervals.append((start, end))
        updated.append(task)

    await db.commit()
    for t in updated:
        await db.refresh(t)

    return updated


@router.post("/estimate-durations", response_model=EstimateDurationsResponse)
async def estimate_durations(
    payload: EstimateDurationsRequest,
    user: CurrentUser,
    db: DbSession,
) -> EstimateDurationsResponse:
    """Rule-based duration estimator. Returns a suggested length in minutes
    for each task_id, plus a human-readable rationale.

    Logic (in order):
      1. Average completed duration of the same category in the last 30 days (≥3 samples).
      2. Average completed duration of all completed tasks in the last 30 days (≥3 samples).
      3. Fallback by energy: high=90, medium=60, low=30, none=45.

    Rounds to nearest 5 minutes. No LLM call — fast and deterministic.
    """
    # Fetch the requested tasks (must belong to user)
    target_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.id.in_(payload.task_ids),
        )
    )
    target_tasks: list[Task] = list(target_rows.scalars().all())

    if not target_tasks:
        return EstimateDurationsResponse(estimates=[])

    # Fetch history: completed tasks with both planned timestamps in last 30 days
    history_start = datetime.now(UTC) - timedelta(days=30)
    history_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.status == TaskStatus.done,
            Task.planned_start_at.is_not(None),
            Task.planned_end_at.is_not(None),
            Task.planned_start_at >= history_start,
            Task.is_break.is_(False),
        )
    )
    history: list[Task] = list(history_rows.scalars().all())

    # Aggregate per-category averages
    cat_durations: dict[uuid.UUID, list[int]] = {}
    overall: list[int] = []
    for t in history:
        if not (t.planned_start_at and t.planned_end_at):
            continue
        mins = int((t.planned_end_at - t.planned_start_at).total_seconds() / 60)
        if mins <= 0 or mins > 480:
            continue
        overall.append(mins)
        if t.category_id:
            cat_durations.setdefault(t.category_id, []).append(mins)

    # Category names for "based_on" message
    cat_rows = await db.execute(
        select(Category.id, Category.name).where(Category.user_id == user.id)
    )
    cat_names = {r.id: r.name for r in cat_rows}

    def _round_to_5(n: float) -> int:
        return max(5, min(480, int(round(n / 5) * 5)))

    estimates: list[DurationEstimate] = []
    for t in target_tasks:
        # 1. Same-category history
        if t.category_id and len(cat_durations.get(t.category_id, [])) >= 3:
            samples = cat_durations[t.category_id]
            avg = sum(samples) / len(samples)
            cat_name = cat_names.get(t.category_id, "категория")
            estimates.append(DurationEstimate(
                task_id=t.id,
                minutes=_round_to_5(avg),
                based_on=f"{len(samples)} похожих задач в «{cat_name}»",
            ))
            continue

        # 2. Overall history
        if len(overall) >= 3:
            avg = sum(overall) / len(overall)
            estimates.append(DurationEstimate(
                task_id=t.id,
                minutes=_round_to_5(avg),
                based_on=f"среднее по {len(overall)} задачам за 30 дней",
            ))
            continue

        # 3. Energy-based fallback
        energy_key = t.energy.value if t.energy else None
        minutes = ENERGY_DEFAULT_MINUTES.get(energy_key, NO_ENERGY_DEFAULT) if energy_key else NO_ENERGY_DEFAULT
        rationale = (
            f"по нагрузке «{energy_key}»" if energy_key
            else "стандартная длительность (мало истории)"
        )
        estimates.append(DurationEstimate(
            task_id=t.id,
            minutes=minutes,
            based_on=rationale,
        ))

    return EstimateDurationsResponse(estimates=estimates)


@router.get("/tip")
async def daily_tip(user: CurrentUser, db: DbSession) -> dict:
    """One short personalized tip for the user's local 'today'."""
    tz_delta = timedelta(minutes=user.utc_offset)
    now_utc = datetime.now(UTC)
    now_local = _to_local(now_utc, tz_delta)
    today_local = now_local.date()
    today_iso = today_local.isoformat()

    # Cache key is per-user + per-local-date (was global → wrong tip for other users)
    cache_key = f"{user.id}:{today_iso}"
    if cache_key in _tip_cache:
        return {"tip": _tip_cache[cache_key], "date": today_iso}

    # Local day boundaries → UTC
    local_midnight_utc = datetime(today_local.year, today_local.month, today_local.day, tzinfo=UTC) - tz_delta
    day_start = local_midnight_utc
    day_end = day_start + timedelta(days=1)

    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= day_start,
            Task.planned_start_at < day_end,
        )
    )
    tasks = rows.scalars().all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.done)
    remaining = total - completed

    # Time-of-day context — tip relevance depends on whether it's morning/evening
    if now_local.hour < 12:
        period = "утро"
    elif now_local.hour < 17:
        period = "день"
    else:
        period = "вечер"

    chronotype_str = CHRONOTYPE_HINTS.get(str(user.chronotype), str(user.chronotype))
    work_window = f"{_mins_to_hhmm(user.work_start)}–{_mins_to_hhmm(user.work_end)}"
    weekday_ru = WEEKDAY_RU[today_local.weekday()]

    system_prompt = (
        "Ты помощник-тренер по продуктивности в приложении TimeFlow. "
        "Дай один короткий конкретный совет на сегодня (1–2 предложения, до 200 символов). "
        "Совет должен быть применим прямо сейчас (учитывай время суток). "
        "Опирайся на профиль и статистику дня — без воды, без приветствий, без эмодзи. "
        "Пиши по-русски, обращайся на «ты»."
    )
    user_msg = (
        f"Дата: {today_iso} ({weekday_ru}), сейчас {now_local.strftime('%H:%M')} ({period}).\n"
        f"Хронотип: {chronotype_str}.\n"
        f"Рабочее окно: {work_window}.\n"
        f"Задач на день: {total}, выполнено: {completed}, осталось: {remaining}."
    )

    try:
        tip = await chat(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}],
            temperature=0.7,
            max_tokens=150,
        )
        _tip_cache[cache_key] = tip.strip()
    except Exception:
        _tip_cache[cache_key] = "Разбей сегодняшние задачи на блоки по 90 минут — и не забывай про короткие перерывы."

    return {"tip": _tip_cache[cache_key], "date": today_iso}


@router.post("/ask")
async def ask_analytics(payload: AskRequest, user: CurrentUser, db: DbSession) -> dict:
    """Answer a user question about their productivity for the given period."""
    if len(payload.question.strip()) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question too short")
    if payload.days not in (7, 30, 90):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="days must be 7, 30 or 90")

    tz_delta = timedelta(minutes=user.utc_offset)
    start, end = _window(payload.days)

    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= start,
            Task.planned_start_at < end,
        )
    )
    tasks = rows.scalars().all()

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.done)
    completion_rate = round(completed / total * 100) if total else 0

    cat_rows = await db.execute(
        select(Category.id, Category.name).where(Category.user_id == user.id)
    )
    cat_names = {str(r.id): r.name for r in cat_rows}

    # Hour stats — convert to LOCAL hour, not UTC
    hourly: dict[int, dict] = {}
    weekday_stats: dict[int, dict] = {}
    breakdown_named: dict[str, int] = {}
    cat_completion: dict[str, dict] = {}

    for t in tasks:
        if not t.planned_start_at:
            continue
        local_dt = _to_local(t.planned_start_at, tz_delta)
        hour = local_dt.hour
        wd = local_dt.weekday()
        # "Done" = в пределах planned_end + 30 мин. Опоздания не зачитываются.
        done = _done_on_time(t)

        hourly.setdefault(hour, {"total": 0, "completed": 0})
        hourly[hour]["total"] += 1
        if done:
            hourly[hour]["completed"] += 1

        weekday_stats.setdefault(wd, {"total": 0, "completed": 0})
        weekday_stats[wd]["total"] += 1
        if done:
            weekday_stats[wd]["completed"] += 1

        if t.planned_end_at and t.category_id:
            mins = int((t.planned_end_at - t.planned_start_at).total_seconds() / 60)
            name = cat_names.get(str(t.category_id), "Без категории")
            breakdown_named[name] = breakdown_named.get(name, 0) + mins
            cat_completion.setdefault(name, {"total": 0, "done": 0})
            cat_completion[name]["total"] += 1
            if done:
                cat_completion[name]["done"] += 1

    productive_hours = sorted(
        [(h, d["completed"] / d["total"], d["total"]) for h, d in hourly.items() if d["total"] >= 2],
        key=lambda x: (-x[1], -x[2]),
    )[:5]
    hours_str = ", ".join(
        f"{h:02d}:00–{h+1:02d}:00 ({round(r*100)}% из {n})" for h, r, n in productive_hours
    ) or "недостаточно данных"

    weekday_str = ", ".join(
        f"{WEEKDAY_RU[wd][:2].capitalize()} ({round(d['completed']/d['total']*100)}%, n={d['total']})"
        for wd, d in sorted(weekday_stats.items()) if d["total"] >= 2
    ) or "недостаточно данных"

    cat_completion_str = json.dumps(
        {name: f"{round(d['done']/d['total']*100)}% (n={d['total']})"
         for name, d in cat_completion.items() if d["total"] >= 2},
        ensure_ascii=False,
    )

    chronotype_str = CHRONOTYPE_HINTS.get(str(user.chronotype), str(user.chronotype))
    work_window = f"{_mins_to_hhmm(user.work_start)}–{_mins_to_hhmm(user.work_end)}"

    stats_summary = (
        f"Период: последние {payload.days} дней.\n"
        f"Хронотип: {chronotype_str}. Рабочее окно: {work_window}.\n"
        f"Всего задач: {total}, выполнено: {completed} ({completion_rate}%).\n"
        f"Минуты по категориям: {json.dumps(breakdown_named, ensure_ascii=False)}.\n"
        f"Completion rate по категориям: {cat_completion_str}.\n"
        f"Продуктивные часы (локальное время): {hours_str}.\n"
        f"По дням недели: {weekday_str}."
    )

    system_prompt = (
        "Ты персональный коуч по продуктивности в приложении TimeFlow. "
        "Твоя роль — не только показывать цифры, но и помогать человеку разобраться в его ритме, "
        "посоветовать рабочие методики, объяснить как устроены энергоблоки и продуктивные часы, "
        "поделиться подходами к планированию (тайм-блокинг, deep work, помодоро, MIT, GTD, "
        "энергоменеджмент, чанкинг и т.п.) — там, где это уместно для вопроса.\n\n"

        "═══ ЧТО ОБСУЖДАЕМ ═══\n"
        "Всё, что связано с продуктивностью, временем, планированием, фокусом, "
        "восстановлением, энергией, привычками, дисциплиной, прокрастинацией — это твоя территория. "
        "Методики, исследования, практические приёмы — тоже можно, если человек спрашивает.\n"
        "Если вопрос совсем мимо (рецепты, кино, политика и т.п.) — мягко переведи на продуктивность "
        "или коротко скажи что это не твоя тема и предложи задать вопрос про задачи/время.\n\n"

        "═══ КАК ОТВЕЧАЕШЬ ═══\n"
        "Тон — тёплый, человечный, без морализаторства и без сухого корпоративного. "
        "Как умный друг, который разобрался в теме и делится по делу.\n\n"

        "Структура (гибкая, не жёсткий шаблон, 4–7 предложений):\n"
        "  1. Прямой ответ или наблюдение по вопросу.\n"
        "  2. Если в данных есть релевантные цифры — обопрись на них (конкретно: проценты, часы, дни).\n"
        "  3. Если уместно — добавь объяснение «почему так» или короткий разбор методики.\n"
        "  4. Закончи практическим шагом, который можно сделать на этой неделе.\n\n"

        "═══ ВАЖНЫЕ ОГРАНИЧЕНИЯ ═══\n"
        "• Никогда не выдумывай цифры. Если данных мало — честно скажи «пока статистики маловато, "
        "но в целом…» и переходи к методическому ответу без выдуманных процентов.\n"
        "• Если предлагаешь методику — кратко, без длинных историй, и привяжи к конкретному "
        "паттерну пользователя (хронотип, продуктивные часы, категории).\n"
        "• Не повторяй формулировку вопроса.\n"
        "• Без markdown, без списков, без эмодзи. Сплошной текст в 1–3 абзаца.\n"
        "• По-русски, на «ты». Без канцелярита и слов вроде «оптимизировать», «эффективность» "
        "там, где можно сказать проще."
    )

    user_msg = f"Данные пользователя:\n{stats_summary}\n\nВопрос: {payload.question.strip()}"

    try:
        answer = await chat(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}],
            temperature=0.6,
            max_tokens=700,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}") from e

    return {"answer": answer.strip()}


@router.get("/insight")
async def get_insight(user: CurrentUser, db: DbSession, days: int = 7) -> dict:
    """Detailed AI insight report comparing the last N days vs previous N days."""
    if days not in (7, 30, 90):
        days = 7

    tz_delta = timedelta(minutes=user.utc_offset)
    now_utc = datetime.now(UTC)
    start = now_utc - timedelta(days=days)
    prev_start = now_utc - timedelta(days=days * 2)

    # Current period
    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= start,
            Task.planned_start_at < now_utc,
        )
    )
    tasks = rows.scalars().all()

    # Previous period (for comparison)
    prev_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= prev_start,
            Task.planned_start_at < start,
        )
    )
    prev_tasks = prev_rows.scalars().all()

    cat_rows = await db.execute(
        select(Category.id, Category.name).where(Category.user_id == user.id)
    )
    cat_names = {str(r.id): r.name for r in cat_rows}

    def _aggregate(task_list: list[Task]) -> dict:
        total = len(task_list)
        completed = sum(1 for t in task_list if t.status == TaskStatus.done)
        on_time = sum(
            1 for t in task_list
            if t.status == TaskStatus.done and t.deadline and t.completed_at
            and t.completed_at.date() <= t.deadline.date()
        )
        with_deadline = sum(1 for t in task_list if t.deadline)

        # Per-category stats
        cat_minutes: dict[str, int] = {}
        cat_total: dict[str, int] = {}
        cat_done: dict[str, int] = {}
        for t in task_list:
            name = cat_names.get(str(t.category_id), "Без категории") if t.category_id else "Без категории"
            if t.planned_start_at and t.planned_end_at:
                mins = int((t.planned_end_at - t.planned_start_at).total_seconds() / 60)
                cat_minutes[name] = cat_minutes.get(name, 0) + mins
            cat_total[name] = cat_total.get(name, 0) + 1
            if t.status == TaskStatus.done:
                cat_done[name] = cat_done.get(name, 0) + 1

        # Hide low-significance categories (n<2) from the prompt
        cat_stats = {
            name: {
                "minutes": cat_minutes.get(name, 0),
                "completion_rate": round(cat_done.get(name, 0) / cat_total[name] * 100),
                "n": cat_total[name],
            }
            for name in cat_total if cat_total[name] >= 2
        }

        # Hour stats — use LOCAL hour. "Done" = в пределах +30 мин от planned_end.
        hourly: dict[int, dict] = {}
        for t in task_list:
            if t.planned_start_at:
                h = _to_local(t.planned_start_at, tz_delta).hour
                hourly.setdefault(h, {"total": 0, "done": 0})
                hourly[h]["total"] += 1
                if _done_on_time(t):
                    hourly[h]["done"] += 1

        # min sample size of 2 for hours/days = filter out noise
        best_hours = sorted(
            [(h, d["done"] / d["total"], d["total"]) for h, d in hourly.items() if d["total"] >= 2],
            key=lambda x: (-x[1], -x[2]),
        )[:3]
        worst_hours = sorted(
            [(h, d["done"] / d["total"], d["total"]) for h, d in hourly.items() if d["total"] >= 2],
            key=lambda x: (x[1], -x[2]),
        )[:3]

        # Weekday stats (local) — тот же on-time критерий
        weekday_short = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        weekday: dict[str, dict] = {}
        for t in task_list:
            if t.planned_start_at:
                wd = weekday_short[_to_local(t.planned_start_at, tz_delta).weekday()]
                weekday.setdefault(wd, {"total": 0, "done": 0})
                weekday[wd]["total"] += 1
                if _done_on_time(t):
                    weekday[wd]["done"] += 1
        best_days = sorted(
            [(d, v["done"] / v["total"], v["total"]) for d, v in weekday.items() if v["total"] >= 2],
            key=lambda x: (-x[1], -x[2]),
        )[:3]

        # Active days (local)
        active_days = len({
            _to_local(t.planned_start_at, tz_delta).date()
            for t in task_list if t.planned_start_at
        })
        avg_per_day = round(total / active_days, 1) if active_days else 0

        # Average task length
        durations = [
            (t.planned_end_at - t.planned_start_at).total_seconds() / 60
            for t in task_list if t.planned_start_at and t.planned_end_at
        ]
        avg_duration = round(sum(durations) / len(durations)) if durations else 0

        return {
            "total": total,
            "completed": completed,
            "completion_rate": round(completed / total * 100) if total else 0,
            "on_time": on_time,
            "with_deadline": with_deadline,
            "on_time_rate": round(on_time / with_deadline * 100) if with_deadline else None,
            "avg_tasks_per_day": avg_per_day,
            "active_days": active_days,
            "avg_task_duration_min": avg_duration,
            "categories": cat_stats,
            "best_hours": [f"{h:02d}:00 ({round(r*100)}%, n={n})" for h, r, n in best_hours],
            "worst_hours": [f"{h:02d}:00 ({round(r*100)}%, n={n})" for h, r, n in worst_hours],
            "best_days": [f"{d} ({round(r*100)}%, n={n})" for d, r, n in best_days],
        }

    curr = _aggregate(tasks)
    prev = _aggregate(prev_tasks)

    rate_delta = curr["completion_rate"] - prev["completion_rate"]
    total_delta = curr["total"] - prev["total"]
    avg_per_day_delta = round(curr["avg_tasks_per_day"] - prev["avg_tasks_per_day"], 1)

    chronotype_str = CHRONOTYPE_HINTS.get(str(user.chronotype), str(user.chronotype))
    work_window = f"{_mins_to_hhmm(user.work_start)}–{_mins_to_hhmm(user.work_end)}"

    payload_obj = {
        "period_days": days,
        "user_profile": {
            "chronotype": chronotype_str,
            "work_window": work_window,
        },
        "current": curr,
        "previous": prev,
        "deltas": {
            "total_tasks": total_delta,
            "completion_rate_pp": rate_delta,
            "avg_tasks_per_day": avg_per_day_delta,
        },
    }

    system_prompt = (
        "Ты персональный аналитик продуктивности в приложении TimeFlow.\n"
        "На основе данных пользователя составь отчёт строго в формате JSON:\n"
        '{"summary": "...", "good": "...", "bad": "...", "advice": "..."}\n\n'
        "Требования к каждому полю (2–3 предложения, по-русски, на «ты»):\n"
        "• summary — общий итог периода с конкретными цифрами и сравнением с прошлым периодом "
        "(используй deltas).\n"
        "• good — что реально удалось: называй конкретные категории/часы/дни недели с цифрами из current.best_*.\n"
        "• bad — что просело: используй current.worst_hours и категории с низким completion_rate. "
        "Если on_time_rate низкий или null — упомяни это.\n"
        "• advice — один практический шаг на следующий период с привязкой к данным "
        "(например: «переноси high energy задачи на 10:00 — там completion 85%»).\n\n"
        "Правила:\n"
        "• Не выдумывай цифры — бери только из payload.\n"
        "• Если current.total < 5 — в summary напиши «данных мало для надёжных выводов», "
        "остальные поля заполни минимально.\n"
        "• Игнорируй пустые/null поля в payload — не упоминай их.\n"
        "• Только JSON, без markdown, без префиксов, без комментариев."
    )

    try:
        raw = await chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload_obj, ensure_ascii=False, indent=2)},
            ],
            temperature=0.3,
            max_tokens=900,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}") from e

    content = raw.strip()
    if content.startswith("```"):
        content = content.split("```", 2)[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    try:
        result = json.loads(content)
        return {
            "days": days,
            "summary": result.get("summary", ""),
            "good":    result.get("good", ""),
            "bad":     result.get("bad", ""),
            "advice":  result.get("advice", ""),
        }
    except json.JSONDecodeError:
        return {
            "days": days,
            "summary": content,
            "good": "",
            "bad": "",
            "advice": "",
        }
