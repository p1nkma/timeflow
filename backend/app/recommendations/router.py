from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.core.enums import TaskStatus
from app.tasks.models import Task

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("")
async def recommendations(user: CurrentUser, db: DbSession) -> dict:
    """Rule-based insights over the last 7 days."""
    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)

    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= week_ago,
            Task.planned_start_at < now,
        )
    )
    tasks = rows.scalars().all()

    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.done)
    overdue = [
        t for t in tasks
        if t.status != TaskStatus.done
        and t.deadline is not None
        and t.deadline < now
    ]
    unscheduled_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at.is_(None),
            Task.status == TaskStatus.pending,
        )
    )
    inbox_count = len(unscheduled_rows.scalars().all())

    insights: list[dict] = []

    if total == 0:
        insights.append({"type": "info", "text": "За последние 7 дней нет запланированных задач. Добавьте задачи в инбокс и запустите планировщик."})
    else:
        rate = completed / total
        if rate >= 0.8:
            insights.append({"type": "success", "text": f"Отличная неделя! Выполнено {round(rate*100)}% задач — продолжайте в том же духе."})
        elif rate >= 0.5:
            insights.append({"type": "info", "text": f"Выполнено {round(rate*100)}% задач. Попробуйте разбить крупные задачи на меньшие блоки."})
        else:
            insights.append({"type": "warning", "text": f"Выполнено только {round(rate*100)}% задач. Возможно, план перегружен — попробуйте AI-планировщик."})

    if overdue:
        insights.append({"type": "danger", "text": f"Просрочено {len(overdue)} задач{'а' if len(overdue) == 1 else '' if len(overdue) < 5 else ''}. Пересмотрите дедлайны или перенесите их в инбокс."})

    if inbox_count > 10:
        insights.append({"type": "warning", "text": f"В инбоксе {inbox_count} задач — запустите «✦ Сгенерировать план», чтобы расставить их по расписанию."})
    elif inbox_count > 0:
        insights.append({"type": "info", "text": f"В инбоксе {inbox_count} нераспланированных задач."})

    return {"insights": insights, "stats": {"total": total, "completed": completed, "overdue": len(overdue), "inbox": inbox_count}}
