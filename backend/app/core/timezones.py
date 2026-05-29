"""Timezone helpers shared across routers.

The DB stores every timestamp as timezone-aware UTC. The user, however, lives
in a fixed offset (``User.utc_offset``, in minutes). "Today", "this week" and
per-day grouping must be computed in the user's local time, otherwise a task at
01:00 local lands on the previous calendar day.

These helpers convert between UTC and the user's local representation and
produce UTC day boundaries for DB queries.
"""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta


def _as_utc(dt: datetime) -> datetime:
    """Normalize to a UTC-aware datetime.

    DB timestamps are stored as UTC. Postgres returns them tz-aware, but SQLite
    (tests) and some code paths hand back naive values. A naive value is assumed
    to already be UTC — we must NOT use ``astimezone`` on it, since that would
    reinterpret it as the host's local time.
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def to_local(dt: datetime, utc_offset_min: int) -> datetime:
    """UTC datetime -> naive datetime in the user's local time."""
    return (_as_utc(dt) + timedelta(minutes=utc_offset_min)).replace(tzinfo=None)


def local_today(utc_offset_min: int, *, now: datetime | None = None) -> date:
    """The user's current local calendar date."""
    now = now or datetime.now(UTC)
    return to_local(now, utc_offset_min).date()


def local_day_bounds_utc(local_day: date, utc_offset_min: int) -> tuple[datetime, datetime]:
    """[start, end) UTC instants that bracket one local calendar day.

    ``local_day`` 00:00 local == (midnight UTC - offset); the window is 24h wide.
    """
    midnight_utc = datetime(
        local_day.year, local_day.month, local_day.day, tzinfo=UTC
    ) - timedelta(minutes=utc_offset_min)
    return midnight_utc, midnight_utc + timedelta(days=1)


def local_today_bounds_utc(
    utc_offset_min: int, *, now: datetime | None = None
) -> tuple[datetime, datetime]:
    """[start, end) UTC instants bracketing the user's local 'today'."""
    return local_day_bounds_utc(local_today(utc_offset_min, now=now), utc_offset_min)
