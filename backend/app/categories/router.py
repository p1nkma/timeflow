import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.categories.models import Category
from app.categories.schemas import CategoryCreate, CategoryOut, CategoryUpdate
from app.core.deps import CurrentUser, DbSession

router = APIRouter(prefix="/categories", tags=["categories"])


async def _get_owned(category_id: uuid.UUID, user_id: uuid.UUID, db) -> Category:
    cat = await db.scalar(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return cat


@router.get("", response_model=list[CategoryOut])
async def list_categories(user: CurrentUser, db: DbSession) -> list[Category]:
    result = await db.scalars(
        select(Category).where(Category.user_id == user.id).order_by(Category.is_system.desc(), Category.name)
    )
    return list(result)


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate, user: CurrentUser, db: DbSession) -> Category:
    cat = Category(
        user_id=user.id,
        key=payload.key,
        name=payload.name,
        color=payload.color,
        is_system=False,
    )
    db.add(cat)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this key already exists",
        ) from exc
    await db.refresh(cat)
    return cat


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    user: CurrentUser,
    db: DbSession,
) -> Category:
    cat = await _get_owned(category_id, user.id, db)
    if payload.name is not None:
        cat.name = payload.name
    if payload.color is not None:
        cat.color = payload.color
    await db.commit()
    await db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    cat = await _get_owned(category_id, user.id, db)
    if cat.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System categories cannot be deleted",
        )
    await db.delete(cat)
    await db.commit()
