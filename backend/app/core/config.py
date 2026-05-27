from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "TimeFlow Backend"
    environment: str = Field(default="dev")
    debug: bool = True

    database_url: str = "postgresql+asyncpg://timeflow:timeflow@localhost:5432/timeflow"

    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl_minutes: int = 60 * 24 * 7

    cors_origins: list[str] = ["http://localhost:5173"]

    telegram_bot_token: str | None = None
    telegram_webhook_secret: str | None = None

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-4-6"


@lru_cache
def get_settings() -> Settings:
    return Settings()
