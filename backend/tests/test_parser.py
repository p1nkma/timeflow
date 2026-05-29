"""Unit tests for the Telegram quick-add parser."""
from datetime import date, datetime

from app.telegram.parse_quick_add import parse_quick_add

# Fixed reference point: Thursday 2026-05-28 09:00
NOW = datetime(2026, 5, 28, 9, 0)
TODAY = NOW.date()


# ── Title extraction ──────────────────────────────────────────────────────────

def test_plain_title():
    r = parse_quick_add("купить молоко", now=NOW)
    assert r.title == "купить молоко"


def test_title_strips_tokens():
    r = parse_quick_add("встреча завтра 14:00 1ч #fixed", now=NOW)
    assert r.title == "встреча"


# ── Energy + Urgent ───────────────────────────────────────────────────────────

def test_one_bang_is_low_energy():
    r = parse_quick_add("задача !", now=NOW)
    assert r.energy == "low"
    assert not r.urgent


def test_two_bangs_medium_urgent():
    r = parse_quick_add("задача !!", now=NOW)
    assert r.energy == "medium"
    assert r.urgent


def test_three_bangs_high_urgent():
    r = parse_quick_add("сегодня 20:00 позвонить !!!", now=NOW)
    assert r.energy == "high"
    assert r.urgent


def test_bang_at_start():
    r = parse_quick_add("!!! дедлайн сдать отчёт", now=NOW)
    assert r.energy == "high"
    assert r.urgent


# ── Dates ─────────────────────────────────────────────────────────────────────

def test_today():
    r = parse_quick_add("пробежка сегодня", now=NOW)
    assert r.date == TODAY


def test_tomorrow():
    r = parse_quick_add("встреча завтра", now=NOW)
    assert r.date == TODAY + __import__("datetime").timedelta(days=1)


def test_day_after_tomorrow():
    r = parse_quick_add("послезавтра", now=NOW)
    assert r.date == TODAY + __import__("datetime").timedelta(days=2)


def test_weekday_next_monday():
    # Thursday → next Monday = +4 days
    r = parse_quick_add("встреча пн", now=NOW)
    assert r.date == date(2026, 6, 1)


def test_weekday_friday():
    # Thursday → this Friday = +1 day
    r = parse_quick_add("сдать задание пт", now=NOW)
    assert r.date == date(2026, 5, 29)


def test_explicit_date_dot():
    r = parse_quick_add("встреча 03.06", now=NOW)
    assert r.date == date(2026, 6, 3)


def test_explicit_date_with_month_name():
    r = parse_quick_add("встреча 15 июня", now=NOW)
    assert r.date == date(2026, 6, 15)


# ── Time ─────────────────────────────────────────────────────────────────────

def test_time_hh_mm():
    r = parse_quick_add("встреча 14:30", now=NOW)
    assert r.start_minutes == 14 * 60 + 30


def test_time_with_v():
    r = parse_quick_add("встреча в 10:00", now=NOW)
    assert r.start_minutes == 600


def test_time_no_minutes():
    r = parse_quick_add("встреча в 9", now=NOW)
    assert r.start_minutes == 540


# ── Duration ─────────────────────────────────────────────────────────────────

def test_duration_hours():
    r = parse_quick_add("встреча 1ч", now=NOW)
    assert r.duration_minutes == 60


def test_duration_minutes():
    r = parse_quick_add("встреча 30м", now=NOW)
    assert r.duration_minutes == 30


def test_duration_90_minutes():
    r = parse_quick_add("пробежка 90м", now=NOW)
    assert r.duration_minutes == 90


def test_duration_fractional_hours():
    r = parse_quick_add("встреча 1.5ч", now=NOW)
    assert r.duration_minutes == 90


def test_duration_two_hours():
    r = parse_quick_add("лекция 2ч", now=NOW)
    assert r.duration_minutes == 120


# ── Category ─────────────────────────────────────────────────────────────────

def test_category_code():
    r = parse_quick_add("задача #кодинг", now=NOW)
    assert r.category == "code"


def test_category_sport():
    r = parse_quick_add("пробежка #спорт", now=NOW)
    assert r.category == "sport"


def test_category_fixed():
    r = parse_quick_add("лекция #вуз", now=NOW)
    assert r.category == "fixed"


def test_no_category():
    r = parse_quick_add("просто задача", now=NOW)
    assert r.category is None


# ── Combined ─────────────────────────────────────────────────────────────────

def test_full_message():
    r = parse_quick_add("!! #кодинг завтра 10:00 сделать задание", now=NOW)
    assert r.title == "сделать задание"
    assert r.energy == "medium"
    assert r.urgent is True
    assert r.date == TODAY + __import__("datetime").timedelta(days=1)
    assert r.start_minutes == 600
    assert r.category == "code"


def test_call_with_date_time_and_duration():
    r = parse_quick_add("созвон завтра 14:00 30м", now=NOW)
    assert r.title == "созвон"
    assert r.start_minutes == 840
    assert r.duration_minutes == 30


def test_no_duration_flag_when_not_given():
    r = parse_quick_add("встреча завтра 10:00", now=NOW)
    assert r.duration_minutes is None
