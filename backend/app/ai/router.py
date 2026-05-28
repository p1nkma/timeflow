from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.ai.client import chat
from app.categories.models import Category
from app.core.deps import CurrentUser, DbSession
from app.core.enums import TaskSource, TaskStatus
from app.tasks.models import Task
from app.tasks.schemas import TaskOut

router = APIRouter(prefix="/ai", tags=["ai"])

# Simple in-memory cache for the daily tip (resets on server restart)
_tip_cache: dict[str, str] = {}


class PlanRequest(BaseModel):
    date: str  # ISO date YYYY-MM-DD to plan for


@router.post("/plan", response_model=list[TaskOut])
async def generate_plan(payload: PlanRequest, user: CurrentUser, db: DbSession) -> list[Task]:
    """
    Takes inbox tasks + locked tasks for the requested date,
    sends them to the LLM, persists the planned schedule.
    """
    try:
        plan_date = datetime.fromisoformat(payload.date).date()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format") from exc

    day_start = datetime(plan_date.year, plan_date.month, plan_date.day, tzinfo=UTC)
    day_end = day_start + timedelta(days=1)

    # Fetch inbox (unscheduled) tasks
    inbox_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at.is_(None),
            Task.status == TaskStatus.pending,
        ).limit(30)
    )
    inbox_tasks = inbox_rows.scalars().all()

    # Fetch locked tasks already on this day
    locked_rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= day_start,
            Task.planned_start_at < day_end,
            Task.locked.is_(True),
        )
    )
    locked_tasks = locked_rows.scalars().all()

    # Fetch category names
    cat_rows = await db.execute(
        select(Category.id, Category.key, Category.name).where(Category.user_id == user.id)
    )
    cats = {str(r.id): {"key": r.key, "name": r.name} for r in cat_rows}

    def _fmt_task(t: Task) -> dict:
        return {
            "id": str(t.id),
            "title": t.title,
            "category": cats.get(str(t.category_id), {}).get("name", "—") if t.category_id else "—",
            "energy": t.energy,
            "urgent": t.urgent,
            "deadline": t.deadline.isoformat() if t.deadline else None,
        }

    system_prompt = (
        "Ты AI-планировщик для приложения тайм-менеджмента. "
        "Тебе дан список задач из инбокса и список заблокированных задач на день. "
        "Расставь задачи из инбокса по временным слотам с 8:00 до 22:00 с учётом:\n"
        "- Срочные задачи — в первой половине дня\n"
        "- high energy → утро/день, low energy → вечер\n"
        "- Между задачами вставляй перерыв 10-15 мин каждые 90 мин\n"
        "- Не пересекайся с заблокированными слотами\n"
        "- Каждой задаче дай краткое поле reason (1 предложение, почему этот слот)\n\n"
        "Ответь строго JSON-массивом объектов вида:\n"
        '[{"id":"<uuid>","planned_start_at":"<ISO datetime с UTC offset>","planned_end_at":"<ISO datetime>","reason":"<строка>"}]\n'
        "Включай только задачи из инбокса. Без пояснений вне JSON."
    )

    user_msg = (
        f"Дата планирования: {payload.date}\n\n"
        f"Заблокированные задачи (уже стоят в расписании):\n"
        f"{json.dumps([_fmt_task(t) for t in locked_tasks], ensure_ascii=False)}\n\n"
        f"Инбокс (нужно расставить):\n"
        f"{json.dumps([_fmt_task(t) for t in inbox_tasks], ensure_ascii=False)}"
    )

    try:
        raw = await chat(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}],
            temperature=0.3,
            max_tokens=2048,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM error: {e}") from e

    # Parse JSON from response (handle markdown code blocks)
    content = raw.strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]

    try:
        slots: list[dict] = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned invalid JSON") from exc

    # Build id→task map for updates
    task_map = {str(t.id): t for t in inbox_tasks}
    updated: list[Task] = []

    for slot in slots:
        task_id = slot.get("id")
        if task_id not in task_map:
            continue
        task = task_map[task_id]
        try:
            task.planned_start_at = datetime.fromisoformat(slot["planned_start_at"])
            task.planned_end_at = datetime.fromisoformat(slot["planned_end_at"])
        except (KeyError, ValueError):
            continue
        task.reason = slot.get("reason")
        task.source = TaskSource.ai
        updated.append(task)

    await db.commit()
    for t in updated:
        await db.refresh(t)

    return updated


@router.get("/tip")
async def daily_tip(user: CurrentUser, db: DbSession) -> dict:
    """Rule-based daily tip (no LLM call needed — cached per day if LLM is used)."""
    today = datetime.now(UTC).date().isoformat()

    if today in _tip_cache:
        return {"tip": _tip_cache[today], "date": today}

    # Gather today's stats for context
    day_start = datetime.fromisoformat(today).replace(tzinfo=UTC)
    day_end = day_start + timedelta(days=1)

    rows = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.planned_start_at >= day_start,
            Task.planned_start_at < day_end,
        )
    )
    tasks = rows.scalars().all()
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.done)

    system_prompt = (
        "Ты помощник-тренер по продуктивности. "
        "Дай один короткий совет на день (1-2 предложения) на основе статистики пользователя. "
        "Пиши по-русски, тепло и мотивирующе. Только текст совета, без приветствий."
    )
    user_msg = f"Сегодня {today}. Задач на день: {total}, выполнено: {completed}."

    try:
        tip = await chat(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_msg}],
            temperature=0.8,
            max_tokens=150,
        )
        _tip_cache[today] = tip.strip()
    except Exception:
        tip = "Разбей сегодняшние задачи на блоки по 90 минут — и не забывай про короткие перерывы."
        _tip_cache[today] = tip

    return {"tip": _tip_cache[today], "date": today}
