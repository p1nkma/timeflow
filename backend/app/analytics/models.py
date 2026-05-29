from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import JSON
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.enums import AnalyticsPeriod
from app.db.base import Base, TimestampMixin
from app.db.types import UUIDPK, fk_uuid


class AnalyticsSnapshot(Base, TimestampMixin):
    """Кэш-снимок аналитики за период.

    category_breakdown — JSONB вида { "<category_id>": <minutes_spent> }.
    """

    __tablename__ = "analytics_snapshots"

    id: Mapped[UUIDPK]
    user_id: Mapped[uuid.UUID] = fk_uuid("users.id")
    period: Mapped[AnalyticsPeriod] = mapped_column(
        SAEnum(AnalyticsPeriod, name="analytics_period"),
        nullable=False,
    )
    category_breakdown: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    total_tasks: Mapped[int] = mapped_column(nullable=False)
    completed_tasks: Mapped[int] = mapped_column(nullable=False)
