from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import AchievementType
from app.db.base import Base, TimestampMixin
from app.db.types import UUIDPK, fk_uuid

if TYPE_CHECKING:
    from app.users.models import User


class Streak(Base, TimestampMixin):
    __tablename__ = "streaks"

    id: Mapped[UUIDPK]
    user_id: Mapped[uuid.UUID] = fk_uuid("users.id")
    current_streak: Mapped[int] = mapped_column(default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(default=0, nullable=False)
    last_active_date: Mapped[date | None] = mapped_column(Date)

    user: Mapped[User] = relationship(back_populates="streak")


class Achievement(Base, TimestampMixin):
    __tablename__ = "achievements"
    __table_args__ = (
        UniqueConstraint("user_id", "type", name="uq_achievements_user_type"),
    )

    id: Mapped[UUIDPK]
    user_id: Mapped[uuid.UUID] = fk_uuid("users.id")
    type: Mapped[AchievementType] = mapped_column(
        SAEnum(AchievementType, name="achievement_type"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="achievements")
