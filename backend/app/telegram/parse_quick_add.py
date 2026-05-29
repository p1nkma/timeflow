"""Python port of frontend/src/shared/utils/parseQuickAdd.ts

Parses strings like:
  "!! #кодинг завтра 10:00 сделать задание"
  "встреча пт 14:30 1ч #fixed"
  "пробежка сегодня !"
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Literal

EnergyLevel = Literal["low", "medium", "high"]
CategoryKey = Literal["study", "code", "freelance", "sport", "reading", "fixed"]

WEEKDAYS: dict[str, int] = {
    "пн": 1, "пон": 1, "понедельник": 1,
    "вт": 2, "вто": 2, "вторник": 2,
    "ср": 3, "сре": 3, "среда": 3, "среду": 3,
    "чт": 4, "чет": 4, "четверг": 4,
    "пт": 5, "пят": 5, "пятница": 5, "пятницу": 5,
    "сб": 6, "суб": 6, "суббота": 6, "субботу": 6,
    "вс": 0, "воск": 0, "воскресенье": 0,
}

MONTHS: dict[str, int] = {
    "янв": 0, "января": 0, "фев": 1, "февраля": 1,
    "мар": 2, "марта": 2, "апр": 3, "апреля": 3,
    "май": 4, "мая": 4, "июн": 5, "июня": 5,
    "июл": 6, "июля": 6, "авг": 7, "августа": 7,
    "сен": 8, "сентября": 8, "окт": 9, "октября": 9,
    "ноя": 10, "ноября": 10, "дек": 11, "декабря": 11,
}

CATEGORY_ALIASES: dict[str, CategoryKey] = {
    "study": "study", "учёба": "study", "учеба": "study",
    "code": "code", "код": "code", "кодинг": "code", "программирование": "code",
    "freelance": "freelance", "фриланс": "freelance",
    "sport": "sport", "спорт": "sport",
    "reading": "reading", "чтение": "reading",
    "fixed": "fixed", "вуз": "fixed",
}


@dataclass
class ParsedQuickAdd:
    title: str = ""
    date: date | None = None          # конкретная дата
    start_minutes: int | None = None  # минуты от полуночи
    duration_minutes: int | None = None
    category: CategoryKey | None = None
    energy: EnergyLevel | None = None
    urgent: bool = False              # !! → urgent


def _next_weekday(from_date: date, target_wd: int, force_next: bool = False) -> date:
    cur = from_date.isoweekday() % 7  # python: Mon=1..Sun=7 → Sun=0
    diff = (target_wd - cur + 7) % 7
    if force_next:
        diff += 7
    elif diff == 0:
        diff = 7
    return from_date + timedelta(days=diff)


def parse_quick_add(text: str, now: datetime | None = None) -> ParsedQuickAdd:
    if now is None:
        now = datetime.now()
    today = now.date()
    lower = text.lower()

    # (start, end) ranges that are already consumed
    consumed: list[tuple[int, int]] = []

    result = ParsedQuickAdd()

    def claim(start: int, end: int) -> bool:
        if any(s < end and start < e for s, e in consumed):
            return False
        consumed.append((start, end))
        return True

    # ── Energy + Urgent: !, !!, !!! (longest match first) ──
    # !!+ consumed as energy=high/medium + urgent; ! alone = energy=low
    for m in re.finditer(r"(?:^|\s)(!+)(?=\s|$)", lower):
        offset = 1 if m.group(0).startswith(" ") else 0
        s = m.start() + offset
        e = s + len(m.group(1))
        if claim(s, e):
            bangs = min(len(m.group(1)), 3)
            result.energy = "low" if bangs == 1 else "medium" if bangs == 2 else "high"
            if bangs >= 2:
                result.urgent = True

    # ── Category: #кодинг etc ──
    alias_pattern = "|".join(sorted(CATEGORY_ALIASES.keys(), key=len, reverse=True))
    for m in re.finditer(rf"#({alias_pattern})(?!\w)", lower):
        if claim(m.start(), m.end()):
            result.category = CATEGORY_ALIASES[m.group(1)]

    # ── Dates ──
    # через N дней/недель
    for m in re.finditer(r"(?<!\w)через\s+(\d+)\s+(дн(?:ей|я|ь)|недел(?:ю|и|ь|ель))(?!\w)", lower):
        num = int(m.group(1))
        unit = m.group(2)
        days = num * 7 if unit.startswith("недел") else num
        if claim(m.start(), m.end()):
            result.date = today + timedelta(days=days)

    # сегодня / завтра / послезавтра
    for word, delta in [("послезавтра", 2), ("завтра", 1), ("сегодня", 0)]:
        for m in re.finditer(rf"(?<!\w){word}(?!\w)", lower):
            if claim(m.start(), m.end()):
                result.date = today + timedelta(days=delta)

    # след пн / следующий вторник
    for m in re.finditer(
        r"(?<!\w)(след(?:ующ(?:ий|ую|ая|ее))?|сл\.?)\s+"
        r"(пн|пон|понедельник|вт|вто|вторник|ср|сре|среда|среду|"
        r"чт|чет|четверг|пт|пят|пятница|пятницу|сб|суб|суббота|субботу|вс|воск|воскресенье)(?!\w)",
        lower,
    ):
        wd = WEEKDAYS.get(m.group(2)) or WEEKDAYS.get(m.group(2)[:3]) or WEEKDAYS.get(m.group(2)[:2])
        if wd is not None and claim(m.start(), m.end()):
            result.date = _next_weekday(today, wd, force_next=True)

    # одиночный день недели
    for m in re.finditer(
        r"(?<!\w)(?:в\s+)?(понедельник|вторник|сред[аеуы]|четверг|пятниц[ауы]|суббот[ауы]|"
        r"воскресенье|пн|вт|ср|чт|пт|сб|вс)(?!\w)",
        lower,
    ):
        raw = m.group(1)
        wd = WEEKDAYS.get(raw) or WEEKDAYS.get(raw[:3]) or WEEKDAYS.get(raw[:2])
        if wd is not None and claim(m.start(), m.end()):
            result.date = _next_weekday(today, wd, force_next=False)

    # 25 мая / 1 января 2027
    month_pat = "|".join(sorted(MONTHS.keys(), key=len, reverse=True))
    for m in re.finditer(rf"\b(\d{{1,2}})\s+({month_pat})(?:\s+(\d{{4}}))?\b", lower):
        day = int(m.group(1))
        month = MONTHS.get(m.group(2))
        if month is None:
            continue
        year = int(m.group(3)) if m.group(3) else today.year
        try:
            d = date(year, month + 1, day)
        except ValueError:
            continue
        if not m.group(3) and d < today:
            d = date(year + 1, month + 1, day)
        if claim(m.start(), m.end()):
            result.date = d

    # 25.05 / 25.05.2026
    for m in re.finditer(r"\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b", lower):
        day, month = int(m.group(1)), int(m.group(2)) - 1
        year = int(m.group(3)) if m.group(3) else today.year
        if year < 100:
            year += 2000
        try:
            d = date(year, month + 1, day)
        except ValueError:
            continue
        if not m.group(3) and d < today:
            d = date(year + 1, month + 1, day)
        if claim(m.start(), m.end()):
            result.date = d

    # ── Time: 10:00, в 10:30 ──
    for m in re.finditer(r"\b(?:в\s+)?([01]?\d|2[0-3]):([0-5]\d)\b", lower):
        if claim(m.start(), m.end()):
            result.start_minutes = int(m.group(1)) * 60 + int(m.group(2))

    # в 10, в 9 (без минут) — не захватываем если сразу идут : или цифра
    for m in re.finditer(r"\bв\s+([01]?\d|2[0-3])(?![:.\-\d])\b", lower):
        if claim(m.start(), m.end()):
            result.start_minutes = int(m.group(1)) * 60

    # ── Duration: 1ч, 90м, 1.5ч ──
    for m in re.finditer(r"\b(\d+(?:[.,]\d+)?)\s*(ч(?:ас(?:а|ов)?)?|h|мин(?:ут[ауы]?)?|м(?!\w))\b", lower):
        num = float(m.group(1).replace(",", "."))
        unit = m.group(2)
        mins = round(num * 60) if unit.startswith("ч") or unit == "h" else round(num)
        if 0 < mins <= 24 * 60 and claim(m.start(), m.end()):
            result.duration_minutes = mins

    # ── Title: всё что не попало в токены ──
    consumed.sort()
    title_parts = []
    cursor = 0
    for s, e in consumed:
        title_parts.append(text[cursor:s])
        cursor = e
    title_parts.append(text[cursor:])
    result.title = re.sub(r"\s+", " ", "".join(title_parts)).strip()

    return result
