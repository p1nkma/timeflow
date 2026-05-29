"""Unit tests for app.core.timezones — the local-day logic that dashboard,
analytics and the Telegram bot rely on. These caught a real bug where 'today'
was computed in UTC instead of the user's offset.
"""
from datetime import UTC, date, datetime

from app.core.timezones import (
    local_day_bounds_utc,
    local_today,
    local_today_bounds_utc,
    to_local,
)

# Moscow = +180 min. A late-UTC instant that is already "tomorrow" locally.
MSK = 180


def test_to_local_shifts_by_offset():
    dt = datetime(2026, 5, 29, 22, 0, tzinfo=UTC)  # 22:00 UTC
    local = to_local(dt, MSK)
    assert local == datetime(2026, 5, 30, 1, 0)  # 01:00 next day, naive


def test_to_local_negative_offset():
    dt = datetime(2026, 5, 29, 2, 0, tzinfo=UTC)
    local = to_local(dt, -300)  # UTC-5
    assert local == datetime(2026, 5, 28, 21, 0)


def test_local_today_uses_offset_not_utc():
    # 22:30 UTC on the 29th is already the 30th in Moscow.
    now = datetime(2026, 5, 29, 22, 30, tzinfo=UTC)
    assert local_today(MSK, now=now) == date(2026, 5, 30)
    assert local_today(0, now=now) == date(2026, 5, 29)


def test_local_day_bounds_bracket_24h_window():
    start, end = local_day_bounds_utc(date(2026, 5, 30), MSK)
    # 30 May 00:00 MSK == 29 May 21:00 UTC
    assert start == datetime(2026, 5, 29, 21, 0, tzinfo=UTC)
    assert end == datetime(2026, 5, 30, 21, 0, tzinfo=UTC)
    assert (end - start).total_seconds() == 24 * 3600


def test_boundary_task_lands_in_correct_local_day():
    """A task at 00:30 local time belongs to *today* locally, even though its
    UTC instant is on the previous calendar date.
    """
    now = datetime(2026, 5, 29, 22, 30, tzinfo=UTC)  # local 30 May 01:30 MSK
    start, end = local_today_bounds_utc(MSK, now=now)
    # Task at 00:30 MSK on the 30th == 21:30 UTC on the 29th.
    task_utc = datetime(2026, 5, 29, 21, 30, tzinfo=UTC)
    assert start <= task_utc < end
    assert to_local(task_utc, MSK).date() == date(2026, 5, 30)
