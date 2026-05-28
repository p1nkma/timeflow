import hashlib
import hmac
import json
from urllib.parse import parse_qsl, unquote

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.auth.schemas import LoginIn, RegisterIn, TokenOut
from app.categories.seed import seed_system_categories
from app.core.config import get_settings
from app.core.deps import DbSession
from app.core.security import hash_password, issue_access_token, verify_password
from app.users.models import User
from app.users.schemas import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterIn, db: DbSession) -> User:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    await seed_system_categories(db, user.id)
    await db.commit()
    await db.refresh(user)
    return user


class TelegramInitData(BaseModel):
    init_data: str


def _verify_telegram_init_data(init_data: str, bot_token: str) -> dict:
    """Verify Telegram WebApp initData HMAC and return parsed user dict."""
    parsed = dict(parse_qsl(unquote(init_data), keep_blank_values=True))
    received_hash = parsed.pop("hash", "")

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("Invalid initData signature")

    user_str = parsed.get("user", "{}")
    return json.loads(user_str)


@router.post("/telegram", response_model=TokenOut)
async def telegram_auth(payload: TelegramInitData, db: DbSession) -> TokenOut:
    """Authenticate via Telegram WebApp initData."""
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Telegram not configured")

    try:
        tg_user = _verify_telegram_init_data(payload.init_data, settings.telegram_bot_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram data") from exc

    tg_id = tg_user.get("id")
    if not tg_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user id in initData")

    from app.telegram.models import TelegramUser
    tg_record = await db.scalar(select(TelegramUser).where(TelegramUser.telegram_id == tg_id))

    if tg_record:
        # Already linked — issue token for linked user
        return TokenOut(access_token=issue_access_token(tg_record.user_id))

    # New Telegram user — create account automatically
    first_name = tg_user.get("first_name", "")
    last_name = tg_user.get("last_name", "")
    full_name = f"{first_name} {last_name}".strip() or f"tg_{tg_id}"
    email = f"tg_{tg_id}@telegram.local"

    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        import secrets as _secrets
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(_secrets.token_hex(32)),
        )
        db.add(user)
        await db.flush()
        await seed_system_categories(db, user.id)

    from datetime import UTC, datetime
    from app.telegram.models import TelegramUser as TU
    db.add(TU(
        user_id=user.id,
        telegram_id=tg_id,
        chat_id=tg_id,
        connected_at=datetime.now(UTC),
    ))
    await db.commit()
    await db.refresh(user)
    return TokenOut(access_token=issue_access_token(user.id))


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, db: DbSession) -> TokenOut:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenOut(access_token=issue_access_token(user.id))
