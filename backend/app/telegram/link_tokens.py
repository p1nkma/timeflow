"""In-memory one-time tokens for Telegram account linking.

Token → user_id mapping, expires in 10 minutes.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

_TTL = timedelta(minutes=10)
_store: dict[str, tuple[uuid.UUID, datetime]] = {}


def create_token(user_id: uuid.UUID) -> str:
    token = secrets.token_urlsafe(24)
    _store[token] = (user_id, datetime.now(UTC) + _TTL)
    return token


async def consume_token(token: str, _db: AsyncSession) -> uuid.UUID | None:
    entry = _store.pop(token, None)
    if entry is None:
        return None
    user_id, expires_at = entry
    if datetime.now(UTC) > expires_at:
        return None
    return user_id
