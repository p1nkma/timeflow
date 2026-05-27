from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Index
from sqlalchemy import Enum as SAEnum
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import EnergyLevel, TaskSource, TaskStatus
from app.db.base import Base, TimestampMixin
from app.db.types import UUIDPK, fk_uuid

if TYPE_CHECKING:
    from app.categories.models import Category
    from app.users.models import User


class Task(Base, TimestampMixin):
    """Task — единая сущность для запланированных задач и Inbox-айтемов.

    Три разных временных контекста (важно не путать):
      * `deadline` — крайний срок (по календарю)
      * `planned_start_at` / `planned_end_at` — когда задача стоит в расписании
      * `started_at` / `completed_at` — фактические старт и закрытие пользователем

    Inbox = задача без planned_start_at.
    """

    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_user_planned_start", "user_id", "planned_start_at"),
        Index("ix_tasks_user_status", "user_id", "status"),
    )

    id: Mapped[UUIDPK]
    user_id: Mapped[uuid.UUID] = fk_uuid("users.id")
    category_id: Mapped[uuid.UUID | None] = fk_uuid(
        "categories.id", nullable=True, ondelete="SET NULL"
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)

    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    planned_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    planned_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="task_status"),
        default=TaskStatus.pending,
        nullable=False,
    )
    source: Mapped[TaskSource] = mapped_column(
        SAEnum(TaskSource, name="task_source"),
        default=TaskSource.user,
        nullable=False,
    )
    energy: Mapped[EnergyLevel | None] = mapped_column(
        SAEnum(EnergyLevel, name="energy_level"),
    )

    locked: Mapped[bool] = mapped_column(default=False, nullable=False)
    urgent: Mapped[bool] = mapped_column(default=False, nullable=False)
    is_break: Mapped[bool] = mapped_column(default=False, nullable=False)

    is_recurring: Mapped[bool] = mapped_column(default=False, nullable=False)
    recurrence_rule: Mapped[str | None] = mapped_column(Text)

    reason: Mapped[str | None] = mapped_column(Text)
    reason_long: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="tasks")
    category: Mapped[Category | None] = relationship(back_populates="tasks")
