import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.enums import Role, Theme


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: Role
    theme: Theme
    created_at: datetime


class UserMeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    theme: Theme | None = None


class AdminUserUpdate(BaseModel):
    role: Role
