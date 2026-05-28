import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.categories.models import Category
from app.core.deps import CurrentUser, DbSession
from app.core.enums import TaskStatus
from app.tasks.models import Task
from app.tasks.schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


async def _get_owned_task(task_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Task:
    task = await db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def _ensure_category_owned(
    category_id: uuid.UUID | None, user_id: uuid.UUID, db: AsyncSession
) -> None:
    if category_id is None:
        return
    cat = await db.scalar(
        select(Category.id).where(Category.id == category_id, Category.user_id == user_id)
    )
    if cat is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found or not owned by user",
        )


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    user: CurrentUser,
    db: DbSession,
    range_from: Annotated[datetime | None, Query(alias="from")] = None,
    range_to: Annotated[datetime | None, Query(alias="to")] = None,
    status_filter: Annotated[TaskStatus | None, Query(alias="status")] = None,
) -> list[Task]:
    """Tasks that sit in the schedule (planned_start_at is not null).

    Filters: [from, to) on planned_start_at, plus status.
    """
    stmt = select(Task).where(Task.user_id == user.id, Task.planned_start_at.is_not(None))
    if range_from is not None:
        stmt = stmt.where(Task.planned_start_at >= range_from)
    if range_to is not None:
        stmt = stmt.where(Task.planned_start_at < range_to)
    if status_filter is not None:
        stmt = stmt.where(Task.status == status_filter)
    stmt = stmt.order_by(Task.planned_start_at)
    return list(await db.scalars(stmt))


@router.get("/inbox", response_model=list[TaskOut])
async def list_inbox(user: CurrentUser, db: DbSession) -> list[Task]:
    """Unscheduled tasks (planned_start_at IS NULL)."""
    stmt = (
        select(Task)
        .where(Task.user_id == user.id, Task.planned_start_at.is_(None))
        .order_by(Task.urgent.desc(), Task.deadline.asc().nulls_last(), Task.created_at)
    )
    return list(await db.scalars(stmt))


@router.get("/search", response_model=list[TaskOut])
async def search_tasks(
    user: CurrentUser,
    db: DbSession,
    q: Annotated[str | None, Query()] = None,
    category_id: Annotated[uuid.UUID | None, Query(alias="category")] = None,
    status_filter: Annotated[TaskStatus | None, Query(alias="status")] = None,
    range_from: Annotated[datetime | None, Query(alias="from")] = None,
    range_to: Annotated[datetime | None, Query(alias="to")] = None,
    urgent: Annotated[bool | None, Query()] = None,
) -> list[Task]:
    stmt = select(Task).where(Task.user_id == user.id)
    if q:
        pat = f"%{q}%"
        stmt = stmt.where(or_(Task.title.ilike(pat), Task.description.ilike(pat)))
    if category_id is not None:
        stmt = stmt.where(Task.category_id == category_id)
    if status_filter is not None:
        stmt = stmt.where(Task.status == status_filter)
    if urgent is not None:
        stmt = stmt.where(Task.urgent.is_(urgent))
    if range_from is not None:
        stmt = stmt.where(Task.planned_start_at >= range_from)
    if range_to is not None:
        stmt = stmt.where(Task.planned_start_at < range_to)
    stmt = stmt.order_by(Task.planned_start_at.asc().nulls_last(), Task.created_at)
    return list(await db.scalars(stmt))


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Task:
    return await _get_owned_task(task_id, user.id, db)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(payload: TaskCreate, user: CurrentUser, db: DbSession) -> Task:
    await _ensure_category_owned(payload.category_id, user.id, db)
    task = Task(user_id=user.id, **payload.model_dump(exclude_unset=False))
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: uuid.UUID,
    payload: TaskUpdate,
    user: CurrentUser,
    db: DbSession,
) -> Task:
    task = await _get_owned_task(task_id, user.id, db)
    if task.locked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is locked and cannot be edited",
        )

    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data:
        await _ensure_category_owned(data["category_id"], user.id, db)

    # Auto-stamp completed_at when status transitions to done.
    if data.get("status") is TaskStatus.done and task.status is not TaskStatus.done:
        data.setdefault("completed_at", datetime.now(UTC))
    # Clear completed_at when un-completing.
    if "status" in data and data["status"] is not TaskStatus.done:
        data.setdefault("completed_at", None)

    for field, value in data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    task = await _get_owned_task(task_id, user.id, db)
    await db.delete(task)
    await db.commit()
