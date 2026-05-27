import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.users.models import User
from app.users.schemas import AdminUserUpdate, UserMeUpdate, UserOut

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserOut)
async def get_me(user: CurrentUser) -> User:
    return user


@router.put("/users/me", response_model=UserOut)
async def update_me(payload: UserMeUpdate, user: CurrentUser, db: DbSession) -> User:
    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.theme is not None:
        user.theme = payload.theme
    await db.commit()
    await db.refresh(user)
    return user


admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/users", response_model=list[UserOut])
async def list_users(_: AdminUser, db: DbSession) -> list[User]:
    result = await db.scalars(select(User).order_by(User.created_at.desc()))
    return list(result)


@admin_router.put("/users/{user_id}", response_model=UserOut)
async def update_user_role(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    _: AdminUser,
    db: DbSession,
) -> User:
    target = await db.scalar(select(User).where(User.id == user_id))
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    target.role = payload.role
    await db.commit()
    await db.refresh(target)
    return target
