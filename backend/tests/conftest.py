"""
Shared test fixtures.
Uses SQLite in-memory so no real Postgres needed.
"""
from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.db.all_models  # noqa: F401 — register ORM mappers
from app.db.base import Base
from app.db.session import get_db
from app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DB_URL, echo=False, future=True)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db(engine):
    """Each test gets its own rolled-back session (clean state)."""
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)
    async with factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(engine):
    """AsyncClient wired to a fresh in-memory DB session per test."""
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)

    async def override_db():
        async with factory() as session:
            yield session
            await session.rollback()

    app.dependency_overrides[get_db] = override_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── helpers ─────────────────────────────────────────────────────────────────

async def register_and_login(client: AsyncClient, email="test@x.com", password="Pass1234!") -> str:
    """Register a user and return the access token."""
    await client.post("/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User",
    })
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
