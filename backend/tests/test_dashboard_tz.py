"""Integration tests: dashboard & analytics report respect the user's
utc_offset when deciding what 'today' / each chart day is.

Regression guard for the bug where these endpoints sliced the day in UTC,
so a Moscow user saw yesterday's date and the wrong tasks at 01:00 local.

Tasks are inserted directly via the ORM with explicit UTC-aware instants we
compute ourselves — this keeps the test correct regardless of how the DB
driver round-trips timezones (SQLite drops tzinfo; Postgres normalizes to UTC).
"""
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.timezones import local_day_bounds_utc, local_today
from app.tasks.models import Task
from app.users.models import User
from tests.conftest import auth, register_and_login

pytestmark = pytest.mark.anyio

MSK = 180  # +03:00


async def _user_id(db, email):
    return await db.scalar(select(User.id).where(User.email == email))


async def _add_task(db, user_id, title, start_utc: datetime):
    db.add(Task(
        id=uuid.uuid4(),
        user_id=user_id,
        title=title,
        planned_start_at=start_utc,
        planned_end_at=start_utc + timedelta(minutes=30),
    ))
    await db.commit()


async def test_dashboard_today_uses_user_offset(client: AsyncClient, db):
    email = "dash_tz@x.com"
    token = await register_and_login(client, email)
    await client.put("/users/me", json={"utc_offset": MSK}, headers=auth(token))

    today = local_today(MSK, now=datetime.now(UTC))
    day_start, _ = local_day_bounds_utc(today, MSK)
    uid = await _user_id(db, email)
    # 00:15 local today == day_start + 15 min (UTC instant is on the prev date).
    await _add_task(db, uid, "Полночь+15 локально", day_start + timedelta(minutes=15))

    r = await client.get("/dashboard", headers=auth(token))
    assert r.status_code == 200
    data = r.json()
    assert data["date"] == today.isoformat()
    assert data["summary"]["total"] == 1
    assert data["tasks"][0]["title"] == "Полночь+15 локально"


async def test_report_groups_by_local_day(client: AsyncClient, db):
    email = "report_tz@x.com"
    token = await register_and_login(client, email)
    await client.put("/users/me", json={"utc_offset": MSK}, headers=auth(token))

    today = local_today(MSK, now=datetime.now(UTC))
    day_start, day_end = local_day_bounds_utc(today, MSK)
    uid = await _user_id(db, email)
    # Two tasks near both edges of the local day.
    await _add_task(db, uid, "t-start", day_start + timedelta(minutes=15))
    await _add_task(db, uid, "t-end", day_end - timedelta(minutes=15))

    r = await client.get("/analytics/report?period=week", headers=auth(token))
    assert r.status_code == 200
    days = {d["date"]: d for d in r.json()["days"]}
    assert today.isoformat() in days
    assert days[today.isoformat()]["total"] == 2


async def test_dashboard_excludes_other_local_day(client: AsyncClient, db):
    """A task scheduled for the user's local *tomorrow* must not appear in today."""
    email = "dash_tomorrow@x.com"
    token = await register_and_login(client, email)
    await client.put("/users/me", json={"utc_offset": MSK}, headers=auth(token))

    today = local_today(MSK, now=datetime.now(UTC))
    _, day_end = local_day_bounds_utc(today, MSK)
    uid = await _user_id(db, email)
    # 30 min past the end of local today == tomorrow morning locally.
    await _add_task(db, uid, "завтра", day_end + timedelta(minutes=30))

    r = await client.get("/dashboard", headers=auth(token))
    assert r.json()["summary"]["total"] == 0
