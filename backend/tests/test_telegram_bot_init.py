"""Regression guard: the app must import without TELEGRAM_BOT_TOKEN, and
get_bot() must fail loudly rather than at module import.

Previously `bot = Bot(token="")` ran at import time and aiogram raised
TokenValidationError, so the whole app crashed on startup whenever the token
was unset.
"""
import app.telegram.bot as bot_module
from app.telegram.bot import get_bot


def test_dispatcher_exists_without_token():
    # dp is created eagerly (no token needed) so handlers can register.
    assert bot_module.dp is not None


def test_get_bot_raises_when_token_missing(monkeypatch):
    monkeypatch.setattr(bot_module, "_bot", None)

    class _NoToken:
        telegram_bot_token = None

    monkeypatch.setattr(bot_module, "get_settings", lambda: _NoToken())
    try:
        get_bot()
        raise AssertionError("get_bot() should raise without a token")
    except RuntimeError as e:
        assert "TELEGRAM_BOT_TOKEN" in str(e)


def test_get_bot_returns_singleton_with_token(monkeypatch):
    monkeypatch.setattr(bot_module, "_bot", None)

    class _WithToken:
        # Syntactically valid dummy token (aiogram validates the shape).
        telegram_bot_token = "123456:AAH-dummytoken-for-tests_000000000000"

    monkeypatch.setattr(bot_module, "get_settings", lambda: _WithToken())
    b1 = get_bot()
    b2 = get_bot()
    assert b1 is b2
