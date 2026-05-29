"""Google Calendar two-way sync with TimeFlow tasks."""
from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime, timedelta

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.core.config import get_settings
from app.core.enums import TaskSource
from app.integrations.google.models import GoogleCalendarToken
from app.tasks.models import Task

# Pattern used to store / recover Google Calendar event IDs.
# Stored in Task.notes as "gcal:<event_id>".
_GCAL_ID_RE = re.compile(r"^gcal:(.+)$")


def _build_credentials(token: GoogleCalendarToken) -> Credentials:
    settings = get_settings()
    # google-auth expects naive UTC datetime for expiry
    expiry = token.expires_at
    if expiry is not None and expiry.tzinfo is not None:
        expiry = expiry.replace(tzinfo=None)
    return Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        expiry=expiry,
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


# ── Export: TimeFlow → Google Calendar ───────────────────────────────────────

def _gcal_id_from_notes(notes: str | None) -> str | None:
    """Extract the Google Calendar event ID stored in Task.notes, or None."""
    if not notes:
        return None
    m = _GCAL_ID_RE.match(notes)
    return m.group(1) if m else None


def _task_to_event_body(task: Task) -> dict:
    """Build a Google Calendar event body from a Task."""
    assert task.planned_start_at and task.planned_end_at
    return {
        "summary": task.title,
        "description": task.description or "",
        "start": {"dateTime": task.planned_start_at.isoformat(), "timeZone": "UTC"},
        "end":   {"dateTime": task.planned_end_at.isoformat(),   "timeZone": "UTC"},
    }


def push_tasks_to_google(
    tasks: list[Task],
    creds: Credentials,
) -> dict[uuid.UUID, str]:
    """Create or update Google Calendar events for the given tasks.

    Returns a mapping {task.id → gcal_event_id} for tasks that were
    successfully pushed, so the caller can persist the gcal IDs back to the DB.

    Tasks with source='google' (imported events) are skipped — we must not
    create duplicates for events we originally pulled from Google.
    Tasks with source='uni' (locked university schedule) are also skipped.
    """
    service = build("calendar", "v3", credentials=creds)
    result: dict[uuid.UUID, str] = {}

    for task in tasks:
        if task.source in (TaskSource.google, "google"):
            continue
        if not task.planned_start_at or not task.planned_end_at:
            continue

        body = _task_to_event_body(task)
        gcal_id = _gcal_id_from_notes(task.notes)

        try:
            if gcal_id:
                # Update existing event, ignore 404 (event deleted on Google side)
                try:
                    service.events().update(
                        calendarId="primary",
                        eventId=gcal_id,
                        body=body,
                    ).execute()
                    result[task.id] = gcal_id
                except Exception:
                    # Event no longer exists in Google — create a fresh one
                    gcal_id = None

            if not gcal_id:
                created = service.events().insert(
                    calendarId="primary",
                    body=body,
                ).execute()
                result[task.id] = created["id"]
        except Exception:
            # Per-task failures are non-fatal — skip and continue
            continue

    return result
