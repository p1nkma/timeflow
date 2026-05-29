from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.enums import TaskStatus
from app.core.timezones import local_today, local_today_bounds_utc
from app.tasks.models import Task
from app.tasks.schemas import TaskOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def dashboard(user: CurrentUser, db: DbSession) -> dict:
    """Today's tasks + a lightweight summary (streak placeholder)."""
    today = local_today(user.utc_offset)
    day_start, day_end = local_today_bounds_utc(user.utc_offset)

    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= day_start,
            Task.planned_start_at < day_end,
        ).order_by(Task.planned_start_at)
    )
    tasks = rows.scalars().all()

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.done)

    return {
        "date": today.isoformat(),
        "tasks": [TaskOut.model_validate(t) for t in tasks],
        "summary": {
            "total": total,
            "completed": completed,
            "completion_rate": round(completed / total * 100) if total else 0,
        },
        "streak": {"current": 0, "longest": 0},  # placeholder until gamification block
    }
