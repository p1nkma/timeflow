import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.core.deps import AdminUser, CurrentUser, DbSession
from app.users.energy_zones import compute_energy_zones
from app.users.models import User
from app.users.schemas import AdminUserUpdate, UserMeUpdate, UserOut

router = APIRouter(tags=["users"])


@router.get("/users/me", response_model=UserOut)
async def get_me(user: CurrentUser) -> User:
    return user


@router.put("/users/me", response_model=UserOut)
async def update_me(payload: UserMeUpdate, user: CurrentUser, db: DbSession) -> User:
    for field in ("full_name", "theme", "chronotype", "work_start", "work_end"):
        val = getattr(payload, field)
        if val is not None:
            setattr(user, field, val)
    await db.commit()
    await db.refresh(user)
    return user


class EnergyZoneOut(BaseModel):
    start_min: int
    end_min: int
    kind: Literal["peak", "recovery", "trough", "dip"]
    source: Literal["chronotype", "history"]


class EnergyZonesResponse(BaseModel):
    chronotype: str
    zones: list[EnergyZoneOut]


@router.get("/me/energy-zones", response_model=EnergyZonesResponse, tags=["users"])
async def get_energy_zones(user: CurrentUser, db: DbSession) -> EnergyZonesResponse:
    """Энергозоны на 24 часа локального времени пользователя.

    Базовая карта — по хронотипу. Если за 14 дней ≥10 завершённых задач,
    топ-часы по completion-rate подтягиваются как `peak` (source='history'),
    худшие — как `trough`.
    """
    zones = await compute_energy_zones(
        db=db,
        user_id=user.id,
        chronotype=str(user.chronotype.value if hasattr(user.chronotype, "value") else user.chronotype),
        utc_offset_min=user.utc_offset,
    )
    return EnergyZonesResponse(
        chronotype=str(user.chronotype.value if hasattr(user.chronotype, "value") else user.chronotype),
        zones=[EnergyZoneOut(
            start_min=z.start_min, end_min=z.end_min, kind=z.kind, source=z.source,
        ) for z in zones],
    )


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
