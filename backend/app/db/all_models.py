"""Single import point for all ORM models.

Importing this module guarantees that every mapped class is registered on
``Base.metadata`` before any relationships are resolved. Used by Alembic
autogenerate and by application startup.
"""

from app.analytics.models import AnalyticsSnapshot  # noqa: F401
from app.categories.models import Category  # noqa: F401
from app.gamification.models import Achievement, Streak  # noqa: F401
from app.integrations.google.models import GoogleCalendarToken  # noqa: F401
from app.tasks.models import Task  # noqa: F401
from app.telegram.models import TelegramUser  # noqa: F401
from app.users.models import User  # noqa: F401
