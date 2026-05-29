import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import Chronotype, Role, Theme


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: Role
    theme: Theme
    chronotype: Chronotype
    work_start: int
    work_end: int
    utc_offset: int
    created_at: datetime


class UserMeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    theme: Theme | None = None
    chronotype: Chronotype | None = None
    work_start: int | None = Field(default=None, ge=0, le=1439)
    work_end: int | None = Field(default=None, ge=0, le=1439)
    utc_offset: int | None = Field(default=None, ge=-720, le=840)


class AdminUserUpdate(BaseModel):
    role: Role
