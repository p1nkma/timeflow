from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.types import UUIDPK, fk_uuid

if TYPE_CHECKING:
    from app.users.models import User


class GoogleCalendarToken(Base, TimestampMixin):
    __tablename__ = "google_calendar_tokens"

    id: Mapped[UUIDPK]
    user_id: Mapped[uuid.UUID] = fk_uuid("users.id")
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="google_token")
