from __future__ import annotations

import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.integrations.google.calendar import events_to_tasks, fetch_events
from app.integrations.google.models import GoogleCalendarToken
from app.integrations.google.oauth import exchange_code, get_auth_url
from app.tasks.models import Task
from app.tasks.schemas import TaskOut

router = APIRouter(prefix="/integrations/google", tags=["google"])
settings = get_settings()

# In-memory state store (user_id → state token) — good enough for single-server MVP
_pending_states: dict[str, str] = {}  # state → user_id str


@router.get("/auth")
async def google_auth(user: CurrentUser) -> dict:
    """Generate Google OAuth2 redirect URL."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google integration is not configured",
        )
    state = secrets.token_urlsafe(24)
    _pending_states[state] = str(user.id)
    return {"url": get_auth_url(state)}


@router.get("/callback")
async def google_callback(
    db: DbSession,
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    """Handle OAuth2 callback from Google."""
    user_id_str = _pending_states.pop(state, None)
    if user_id_str is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state")

    import uuid
    user_id = uuid.UUID(user_id_str)

    try:
        token_data = exchange_code(code)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Token exchange failed: {exc}") from exc

    existing = await db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.user_id == user_id)
    )
    expires_at = token_data["expires_at"]
    if isinstance(expires_at, datetime) and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    if existing:
        existing.access_token = token_data["access_token"]
        if token_data.get("refresh_token"):
            existing.refresh_token = token_data["refresh_token"]
        existing.expires_at = expires_at
    else:
        db.add(GoogleCalendarToken(
            user_id=user_id,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token", ""),
            expires_at=expires_at,
        ))

    await db.commit()

    # Redirect back to frontend settings page
    frontend_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"
    return RedirectResponse(url=f"{frontend_url}/settings?google=connected")


@router.get("/status")
async def google_status(user: CurrentUser, db: DbSession) -> dict:
    token = await db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.user_id == user.id)
    )
    if token is None:
        return {"connected": False}
    return {
        "connected": True,
        "expires_at": token.expires_at.isoformat(),
    }


@router.delete("/status", status_code=status.HTTP_204_NO_CONTENT)
async def google_disconnect(user: CurrentUser, db: DbSession) -> None:
    token = await db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.user_id == user.id)
    )
    if token:
        await db.delete(token)
        await db.commit()


@router.post("/sync", response_model=list[TaskOut])
async def google_sync(
    user: CurrentUser,
    db: DbSession,
    days_ahead: int = Query(default=7, ge=1, le=30),
) -> list[Task]:
    """Import upcoming Google Calendar events as locked tasks."""
    token = await db.scalar(
        select(GoogleCalendarToken).where(GoogleCalendarToken.user_id == user.id)
    )
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Calendar not connected",
        )

    try:
        events = fetch_events(token, days_ahead=days_ahead)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Calendar fetch failed: {exc}",
        ) from exc

    new_tasks = events_to_tasks(events, user.id)
    if not new_tasks:
        return []

    # Dedup: skip events already imported (matched by gcal: notes prefix)
    existing_notes = set(
        row[0]
        for row in (
            await db.execute(
                select(Task.notes).where(
                    Task.user_id == user.id,
                    Task.source == "google",
                    Task.notes.isnot(None),
                )
            )
        ).all()
    )

    added: list[Task] = []
    for task in new_tasks:
        if task.notes and task.notes in existing_notes:
            continue
        db.add(task)
        added.append(task)

    await db.commit()
    for t in added:
        await db.refresh(t)

    return added
