from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.types import UUIDPK, fk_uuid

if TYPE_CHECKING:
    from app.tasks.models import Task
    from app.users.models import User


class Category(Base, TimestampMixin):
    """User category.

    Каждому пользователю при регистрации сидится 6 «системных» категорий
    с теми же `key`, что у фронта (study/code/freelance/sport/reading/fixed).
    Юзер может переименовывать, менять цвет, добавлять свои.
    """

    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "key", name="uq_categories_user_key"),)

    id: Mapped[UUIDPK]
    user_id: Mapped[uuid.UUID] = fk_uuid("users.id")
    key: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    color: Mapped[str] = mapped_column(String(16), nullable=False)
    is_system: Mapped[bool] = mapped_column(default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="categories")
    tasks: Mapped[list[Task]] = relationship(back_populates="category")
