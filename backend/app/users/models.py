from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import Chronotype, Role, Theme
from app.db.base import Base, TimestampMixin
from app.db.types import UUIDPK

if TYPE_CHECKING:
    from app.categories.models import Category
    from app.gamification.models import Achievement, Streak
    from app.integrations.google.models import GoogleCalendarToken
    from app.tasks.models import Task
    from app.telegram.models import TelegramUser


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[UUIDPK]
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(
        SAEnum(Role, name="role"),
        default=Role.user,
        nullable=False,
    )
    theme: Mapped[Theme] = mapped_column(
        SAEnum(Theme, name="theme"),
        default=Theme.light,
        nullable=False,
    )
    chronotype: Mapped[Chronotype] = mapped_column(
        SAEnum(Chronotype, name="chronotype"),
        default=Chronotype.pigeon,
        nullable=False,
    )
    work_start: Mapped[int] = mapped_column(Integer, default=540, nullable=False)    # minutes, default 9:00
    work_end: Mapped[int] = mapped_column(Integer, default=1200, nullable=False)    # minutes, default 20:00
    utc_offset: Mapped[int] = mapped_column(Integer, default=180, nullable=False)   # UTC offset in minutes, default +3 (Moscow)

    categories: Mapped[list[Category]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    tasks: Mapped[list[Task]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    telegram: Mapped[TelegramUser | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    google_token: Mapped[GoogleCalendarToken | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    streak: Mapped[Streak | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    achievements: Mapped[list[Achievement]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
