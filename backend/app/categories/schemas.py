import uuid

from pydantic import BaseModel, ConfigDict, Field


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    name: str
    color: str
    is_system: bool


class CategoryCreate(BaseModel):
    key: str = Field(min_length=1, max_length=32, pattern=r"^[a-z0-9_]+$")
    name: str = Field(min_length=1, max_length=64)
    color: str = Field(min_length=4, max_length=16, pattern=r"^#[0-9a-fA-F]{3,8}$")


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    color: str | None = Field(default=None, min_length=4, max_length=16, pattern=r"^#[0-9a-fA-F]{3,8}$")
