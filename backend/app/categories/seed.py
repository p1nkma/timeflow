import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.categories.models import Category

# Same 6 keys as the frontend (shared/utils/categories.ts).
SYSTEM_CATEGORIES: list[dict[str, str]] = [
    {"key": "study", "name": "Учёба", "color": "#7dd3fc"},
    {"key": "code", "name": "Код", "color": "#a5b4fc"},
    {"key": "freelance", "name": "Фриланс", "color": "#fcd34d"},
    {"key": "sport", "name": "Спорт", "color": "#86efac"},
    {"key": "reading", "name": "Чтение", "color": "#f9a8d4"},
    {"key": "fixed", "name": "Фиксированное", "color": "#94a3b8"},
]


async def seed_system_categories(db: AsyncSession, user_id: uuid.UUID) -> None:
    db.add_all(
        Category(user_id=user_id, key=c["key"], name=c["name"], color=c["color"], is_system=True)
        for c in SYSTEM_CATEGORIES
    )
    await db.flush()
