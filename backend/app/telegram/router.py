from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import select

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.telegram.bot import dp, get_bot
from app.telegram.link_tokens import create_token
from app.telegram.models import TelegramUser

router = APIRouter(prefix="/telegram", tags=["telegram"])
settings = get_settings()


@router.get("/auth")
async def telegram_auth(user: CurrentUser) -> dict:
    """Generate a one-time deeplink for connecting Telegram account."""
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram integration is not configured",
        )
    token = create_token(user.id)
    bot_info = await get_bot().get_me()
    return {
        "url": f"https://t.me/{bot_info.username}?start={token}",
        "expires_in": 600,
    }


@router.get("/status")
async def telegram_status(user: CurrentUser, db: DbSession) -> dict:
    tg = await db.scalar(
        select(TelegramUser).where(TelegramUser.user_id == user.id)
    )
    if tg is None:
        return {"connected": False}
    return {
        "connected": True,
        "telegram_id": tg.telegram_id,
        "notifications_enabled": tg.notifications_enabled,
        "connected_at": tg.connected_at.isoformat() if tg.connected_at else None,
    }


@router.put("/status")
async def toggle_notifications(user: CurrentUser, db: DbSession, enabled: bool) -> dict:
    tg = await db.scalar(
        select(TelegramUser).where(TelegramUser.user_id == user.id)
    )
    if tg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Telegram not connected")
    tg.notifications_enabled = enabled
    await db.commit()
    return {"notifications_enabled": enabled}


@router.delete("/status", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_telegram(user: CurrentUser, db: DbSession) -> None:
    tg = await db.scalar(
        select(TelegramUser).where(TelegramUser.user_id == user.id)
    )
    if tg:
        await db.delete(tg)
        await db.commit()


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict:
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram integration is not configured",
        )
    if settings.telegram_webhook_secret and x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid secret")

    from aiogram.types import Update

    body = await request.json()
    update = Update.model_validate(body)
    await dp.feed_update(get_bot(), update)
    return {"ok": True}
