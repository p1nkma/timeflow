"""Google Calendar read-only sync → TimeFlow tasks."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import get_settings
from app.core.enums import TaskSource
from app.integrations.google.models import GoogleCalendarToken
from app.tasks.models import Task


def _build_credentials(token: GoogleCalendarToken) -> Credentials:
    settings = get_settings()
    return Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        expiry=token.expires_at,
    )


def _parse_event(event: dict, user_id: uuid.UUID) -> Task | None:
    """Convert a Google Calendar event dict to a Task ORM object."""
    summary = event.get("summary", "").strip()
    if not summary:
        return None

    start_raw = event.get("start", {})
    end_raw = event.get("end", {})

    # All-day events have "date", timed events have "dateTime"
    if "dateTime" in start_raw:
        planned_start = datetime.fromisoformat(start_raw["dateTime"]).astimezone(UTC).replace(tzinfo=UTC)
        planned_end = datetime.fromisoformat(end_raw["dateTime"]).astimezone(UTC).replace(tzinfo=UTC)
    elif "date" in start_raw:
        # All-day: treat as 00:00–23:59 UTC
        d = datetime.fromisoformat(start_raw["date"])
        planned_start = datetime(d.year, d.month, d.day, tzinfo=UTC)
        planned_end = planned_start + timedelta(hours=23, minutes=59)
    else:
        return None

    description = event.get("description", "")
    gcal_id = event.get("id", "")

    return Task(
        user_id=user_id,
        title=summary[:255],
        description=description[:1000] if description else None,
        planned_start_at=planned_start,
        planned_end_at=planned_end,
        source=TaskSource.google,
        locked=True,
        notes=f"gcal:{gcal_id}",  # store gcal id for dedup
    )


def fetch_events(token: GoogleCalendarToken, days_ahead: int = 7) -> tuple[list[dict], Credentials]:
    """Fetch upcoming events. Returns (events, creds) — creds may have refreshed token."""
    creds = _build_credentials(token)
    service = build("calendar", "v3", credentials=creds)

    now = datetime.now(UTC)
    time_max = now + timedelta(days=days_ahead)

    result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=time_max.isoformat(),
            singleEvents=True,
            orderBy="startTime",
            maxResults=100,
        )
        .execute()
    )
    return result.get("items", []), creds


def events_to_tasks(events: list[dict], user_id: uuid.UUID) -> list[Task]:
    tasks = []
    for event in events:
        task = _parse_event(event, user_id)
        if task:
            tasks.append(task)
    return tasks
