"""aiogram bot instance + handlers."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, Message
from aiogram.utils.keyboard import InlineKeyboardBuilder
from sqlalchemy import select

from app.core.config import get_settings
from app.core.enums import TaskSource, TaskStatus
from app.core.timezones import local_today_bounds_utc, to_local
from app.db.session import AsyncSessionLocal
from app.tasks.models import Task
from app.telegram.models import TelegramUser
from app.users.models import User

settings = get_settings()

# Bot is created lazily: aiogram's Bot("") raises TokenValidationError at
# construction time, so building it at import would crash the whole app
# whenever TELEGRAM_BOT_TOKEN is unset. The Dispatcher needs no token and is
# created eagerly so handler decorators below can register.
dp = Dispatcher()

_bot: Bot | None = None


def get_bot() -> Bot:
    """Return the singleton Bot instance, raising if the token is missing."""
    global _bot
    if _bot is None:
        token = get_settings().telegram_bot_token
        if not token:
            raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
        _bot = Bot(token=token)
    return _bot


async def _get_tg_user(telegram_id: int) -> TelegramUser | None:
    async with AsyncSessionLocal() as db:
        return await db.scalar(
            select(TelegramUser).where(TelegramUser.telegram_id == telegram_id)
        )


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    if not message.from_user:
        return

    args = message.text.split(maxsplit=1)[1] if message.text and " " in message.text else ""

    if not args:
        await message.answer(
            "👋 Привет! Я TimeFlow — твой планировщик.\n\n"
            "Чтобы подключить аккаунт, перейди в веб-приложение → Настройки → Telegram."
        )
        return

    # args = link token; find pending link
    async with AsyncSessionLocal() as db:
        from app.telegram.link_tokens import consume_token

        user_id = await consume_token(args, db)
        if user_id is None:
            await message.answer("❌ Ссылка недействительна или устарела.")
            return

        # Upsert TelegramUser
        existing = await db.scalar(
            select(TelegramUser).where(TelegramUser.telegram_id == message.from_user.id)
        )
        if existing:
            existing.user_id = user_id
            existing.chat_id = message.chat.id
            existing.connected_at = datetime.now(UTC)
        else:
            db.add(
                TelegramUser(
                    user_id=user_id,
                    telegram_id=message.from_user.id,
                    chat_id=message.chat.id,
                    connected_at=datetime.now(UTC),
                )
            )
        await db.commit()

    await message.answer("✅ Аккаунт успешно привязан! Теперь ты будешь получать напоминания о задачах.")


@dp.message(Command("tasks"))
async def cmd_tasks(message: Message) -> None:
    if not message.from_user:
        return

    tg_user = await _get_tg_user(message.from_user.id)
    if not tg_user:
        await message.answer("Сначала привяжи аккаунт через веб-приложение.")
        return

    async with AsyncSessionLocal() as db:
        app_user = await db.scalar(select(User).where(User.id == tg_user.user_id))
        utc_offset = app_user.utc_offset if app_user else 180
        day_start, day_end = local_today_bounds_utc(utc_offset)
        rows = await db.scalars(
            select(Task).where(
                Task.user_id == tg_user.user_id,
                Task.planned_start_at >= day_start,
                Task.planned_start_at < day_end,
            ).order_by(Task.planned_start_at)
        )
        tasks = rows.all()

    if not tasks:
        await message.answer("📭 На сегодня задач нет.")
        return

    lines = ["📋 *Задачи на сегодня:*\n"]
    for t in tasks:
        status = "✅" if t.status == TaskStatus.done else "⏳"
        time_str = ""
        if t.planned_start_at:
            time_str = to_local(t.planned_start_at, utc_offset).strftime("%H:%M")
        lines.append(f"{status} {time_str} {t.title}")

    await message.answer("\n".join(lines), parse_mode="Markdown")


@dp.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "🤖 *TimeFlow Bot*\n\n"
        "Просто напиши текст — и задача попадёт в инбокс.\n\n"
        "Команды:\n"
        "/tasks — задачи на сегодня\n"
        "/help — эта справка",
        parse_mode="Markdown",
    )


@dp.message(F.text)
async def handle_text(message: Message) -> None:
    """Plain text → parse and create task (inbox or scheduled)."""
    if not message.from_user or not message.text:
        return

    tg_user = await _get_tg_user(message.from_user.id)
    if not tg_user:
        await message.answer(
            "Сначала привяжи аккаунт: веб-приложение → Настройки → Telegram."
        )
        return

    from app.telegram.parse_quick_add import parse_quick_add

    # Get user's UTC offset for correct local time handling
    async with AsyncSessionLocal() as db:
        app_user = await db.scalar(select(User).where(User.id == tg_user.user_id))
    utc_offset_minutes = app_user.utc_offset if app_user else 180
    user_tz = timezone(timedelta(minutes=utc_offset_minutes))

    parsed = parse_quick_add(message.text, now=datetime.now(user_tz))

    # If date+time given but no duration — ask via inline buttons before saving
    if parsed.date and parsed.start_minutes is not None and parsed.duration_minutes is None:
        time_str = f"{parsed.start_minutes // 60:02d}:{parsed.start_minutes % 60:02d}"
        builder = InlineKeyboardBuilder()
        for mins, label in [(30, "30 мин"), (60, "1 ч"), (90, "1.5 ч"), (120, "2 ч")]:
            builder.add(InlineKeyboardButton(
                text=label,
                callback_data=f"dur:{mins}:{parsed.date.isoformat()}:{parsed.start_minutes}:{(parsed.title or message.text)[:200]}:{parsed.energy or ''}:{1 if parsed.urgent else 0}",
            ))
        builder.adjust(4)
        await message.answer(
            f"⏱ «{(parsed.title or message.text)[:60]}» на {parsed.date.strftime('%d.%m')} в {time_str}\nСколько времени займёт?",
            reply_markup=builder.as_markup(),
        )
        return

    planned_start = None
    planned_end = None

    if parsed.date and parsed.start_minutes is not None:
        duration = parsed.duration_minutes
        local_start = datetime(
            parsed.date.year, parsed.date.month, parsed.date.day,
            parsed.start_minutes // 60, parsed.start_minutes % 60,
            tzinfo=user_tz,
        )
        planned_start = local_start.astimezone(UTC)
        total_end_min = parsed.start_minutes + duration
        local_end = datetime(
            parsed.date.year, parsed.date.month, parsed.date.day,
            (total_end_min // 60) % 24, total_end_min % 60,
            tzinfo=user_tz,
        )
        planned_end = local_end.astimezone(UTC)

    async with AsyncSessionLocal() as db:
        task = Task(
            user_id=tg_user.user_id,
            title=(parsed.title or message.text)[:255],
            source=TaskSource.telegram,
            energy=parsed.energy,
            urgent=parsed.urgent,
            planned_start_at=planned_start,
            planned_end_at=planned_end,
            deadline=datetime.combine(parsed.date, datetime.min.time()).replace(tzinfo=UTC)
            if parsed.date and planned_start is None else None,
        )
        db.add(task)
        await db.commit()

    if planned_start:
        time_str = f"{parsed.start_minutes // 60:02d}:{parsed.start_minutes % 60:02d}"
        dur_str = f" на {parsed.duration_minutes} мин" if parsed.duration_minutes else ""
        await message.answer(
            f"📅 Запланировано на {parsed.date.strftime('%d.%m')} в {time_str}{dur_str}: «{parsed.title[:60]}»"
        )
    else:
        await message.answer(f'📥 Добавлено в инбокс: «{(parsed.title or message.text)[:60]}»')


@dp.callback_query(F.data.startswith("dur:"))
async def callback_duration(call: CallbackQuery) -> None:
    """Handle duration picker button press."""
    if not call.from_user or not call.message:
        return

    tg_user = await _get_tg_user(call.from_user.id)
    if not tg_user:
        await call.answer("Аккаунт не привязан", show_alert=True)
        return

    # Parse callback: dur:{mins}:{date}:{start_min}:{title}:{energy}:{urgent}
    # maxsplit=6 → exactly 7 parts, title may contain colons (captured whole)
    parts = call.data.split(":", 6)
    if len(parts) < 7:
        await call.answer("Ошибка данных", show_alert=True)
        return

    _, dur_str, date_str, start_str, title, energy_str, urgent_str = parts
    duration = int(dur_str)
    start_min = int(start_str)
    from datetime import date as date_type
    task_date = date_type.fromisoformat(date_str)
    energy = energy_str if energy_str else None
    urgent = urgent_str == "1"

    async with AsyncSessionLocal() as db:
        app_user = await db.scalar(select(User).where(User.id == tg_user.user_id))
    utc_offset_minutes = app_user.utc_offset if app_user else 180
    user_tz = timezone(timedelta(minutes=utc_offset_minutes))

    local_start = datetime(task_date.year, task_date.month, task_date.day,
                           start_min // 60, start_min % 60, tzinfo=user_tz)
    planned_start = local_start.astimezone(UTC)
    total_end_min = start_min + duration
    local_end = datetime(task_date.year, task_date.month, task_date.day,
                         (total_end_min // 60) % 24, total_end_min % 60, tzinfo=user_tz)
    planned_end = local_end.astimezone(UTC)

    async with AsyncSessionLocal() as db:
        task = Task(
            user_id=tg_user.user_id,
            title=title[:255],
            source=TaskSource.telegram,
            energy=energy,
            urgent=urgent,
            planned_start_at=planned_start,
            planned_end_at=planned_end,
        )
        db.add(task)
        await db.commit()

    time_str = f"{start_min // 60:02d}:{start_min % 60:02d}"
    dur_label = {30: "30 мин", 60: "1 ч", 90: "1.5 ч", 120: "2 ч"}.get(duration, f"{duration} мин")
    await call.message.edit_text(
        f"📅 Запланировано на {task_date.strftime('%d.%m')} в {time_str} на {dur_label}: «{title[:60]}»"
    )
    await call.answer()
