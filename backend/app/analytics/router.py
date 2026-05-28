from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.categories.models import Category
from app.core.deps import CurrentUser, DbSession
from app.core.enums import TaskStatus
from app.tasks.models import Task

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _window(days: int) -> tuple[datetime, datetime]:
    now = datetime.now(UTC)
    return now - timedelta(days=days), now


@router.get("/summary")
async def summary(
    user: CurrentUser,
    db: DbSession,
    days: Annotated[int, Query(ge=1, le=365)] = 7,
) -> dict:
    """Rolling N-day summary: total/completed tasks + category breakdown (minutes)."""
    start, end = _window(days)

    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= start,
            Task.planned_start_at < end,
        )
    )
    tasks = rows.scalars().all()

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.done)

    # category_breakdown: { category_id: minutes }
    breakdown: dict[str, int] = {}
    for t in tasks:
        if t.category_id and t.planned_start_at and t.planned_end_at:
            mins = int((t.planned_end_at - t.planned_start_at).total_seconds() / 60)
            key = str(t.category_id)
            breakdown[key] = breakdown.get(key, 0) + mins

    completion_rate = round(completed / total * 100) if total else 0

    return {
        "days": days,
        "total_tasks": total,
        "completed_tasks": completed,
        "completion_rate": completion_rate,
        "category_breakdown": breakdown,
    }


@router.get("/report")
async def report(
    user: CurrentUser,
    db: DbSession,
    period: Annotated[str, Query(pattern="^(week|month)$")] = "week",
) -> dict:
    """Per-day breakdown for charting (last 7 or 30 days)."""
    days = 7 if period == "week" else 30
    start, end = _window(days)

    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= start,
            Task.planned_start_at < end,
        )
    )
    tasks = rows.scalars().all()

    # Build day-by-day counts
    daily: dict[str, dict] = {}
    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        daily[d] = {"date": d, "total": 0, "completed": 0}

    for t in tasks:
        if t.planned_start_at:
            d = t.planned_start_at.date().isoformat()
            if d in daily:
                daily[d]["total"] += 1
                if t.status == TaskStatus.done:
                    daily[d]["completed"] += 1

    # Fetch category names for breakdown
    cat_rows = await db.execute(
        select(Category.id, Category.name, Category.color).where(Category.user_id == user.id)
    )
    categories = {str(r.id): {"name": r.name, "color": r.color} for r in cat_rows}

    return {
        "period": period,
        "days": sorted(daily.values(), key=lambda x: x["date"]),
        "categories": categories,
    }
