from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.all_models  # noqa: F401  -- register all ORM mappers
from app.ai.router import router as ai_router
from app.analytics.router import router as analytics_router
from app.auth.router import router as auth_router
from app.categories.router import router as categories_router
from app.core.config import get_settings
from app.dashboard.router import router as dashboard_router
from app.recommendations.router import router as recommendations_router
from app.integrations.google.router import router as google_router
from app.tasks.router import router as tasks_router
from app.telegram.router import router as telegram_router
from app.users.router import admin_router
from app.users.router import router as users_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "env": settings.environment}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(admin_router)
app.include_router(categories_router)
app.include_router(tasks_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(recommendations_router)
app.include_router(ai_router)
app.include_router(telegram_router)
app.include_router(google_router)
