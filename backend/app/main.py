from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.all_models  # noqa: F401  -- register all ORM mappers
from app.auth.router import router as auth_router
from app.core.config import get_settings
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
