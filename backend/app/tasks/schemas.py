import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import EnergyLevel, TaskSource, TaskStatus


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID | None
    title: str
    description: str | None
    notes: str | None
    deadline: datetime | None
    planned_start_at: datetime | None
    planned_end_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None
    status: TaskStatus
    source: TaskSource
    energy: EnergyLevel | None
    locked: bool
    urgent: bool
    is_break: bool
    is_recurring: bool
    recurrence_rule: str | None
    reason: str | None
    reason_long: str | None
    created_at: datetime
    updated_at: datetime


class _TaskTimingMixin(BaseModel):
    @model_validator(mode="after")
    def _check_planned_range(self) -> Self:
        s = getattr(self, "planned_start_at", None)
        e = getattr(self, "planned_end_at", None)
        if (s is None) != (e is None):
            raise ValueError("planned_start_at and planned_end_at must be both set or both null")
        if s is not None and e is not None and e <= s:
            raise ValueError("planned_end_at must be after planned_start_at")
        return self


class TaskCreate(_TaskTimingMixin):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    notes: str | None = None
    category_id: uuid.UUID | None = None
    deadline: datetime | None = None
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    energy: EnergyLevel | None = None
    urgent: bool = False
    is_break: bool = False
    is_recurring: bool = False
    recurrence_rule: str | None = None
    source: TaskSource = TaskSource.user


class TaskUpdate(_TaskTimingMixin):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    notes: str | None = None
    category_id: uuid.UUID | None = None
    deadline: datetime | None = None
    planned_start_at: datetime | None = None
    planned_end_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    status: TaskStatus | None = None
    energy: EnergyLevel | None = None
    urgent: bool | None = None
    is_break: bool | None = None
    is_recurring: bool | None = None
    recurrence_rule: str | None = None
