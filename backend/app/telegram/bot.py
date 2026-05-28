"""aiogram bot instance + handlers."""
from __future__ import annotations

from datetime import UTC, datetime

from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import Message
from sqlalchemy import select

from app.core.config import get_settings
from app.core.enums import TaskStatus
from app.db.session import AsyncSessionLocal
from app.tasks.models import Task
from app.telegram.models import TelegramUser

settings = get_settings()

bot = Bot(token=settings.telegram_bot_token or "")
dp = Dispatcher()


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

    now = datetime.now(UTC)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = now.replace(hour=23, minute=59, second=59, microsecond=0)

    async with AsyncSessionLocal() as db:
        rows = await db.scalars(
            select(Task).where(
                Task.user_id == tg_user.user_id,
                Task.planned_start_at >= day_start,
                Task.planned_start_at <= day_end,
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
            time_str = t.planned_start_at.strftime("%H:%M")
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

    from app.core.enums import TaskSource
    from app.telegram.parse_quick_add import parse_quick_add

    parsed = parse_quick_add(message.text)

    planned_start = None
    planned_end = None

    if parsed.date and parsed.start_minutes is not None:
        duration = parsed.duration_minutes or 60
        planned_start = datetime(
            parsed.date.year, parsed.date.month, parsed.date.day,
            parsed.start_minutes // 60, parsed.start_minutes % 60,
            tzinfo=UTC,
        )
        planned_end = planned_start.replace(  # noqa: DTZ005
            hour=(parsed.start_minutes + duration) // 60 % 24,
            minute=(parsed.start_minutes + duration) % 60,
        )

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
        await message.answer(
            f"📅 Запланировано на {parsed.date.strftime('%d.%m')} в {time_str}: «{parsed.title[:60]}»"
        )
    else:
        await message.answer(f'📥 Добавлено в инбокс: «{(parsed.title or message.text)[:60]}»')
