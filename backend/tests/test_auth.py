"""Auth: register, login, token validation, duplicate prevention."""
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_register_success(client: AsyncClient):
    resp = await client.post("/auth/register", json={
        "email": "new@x.com",
        "password": "Pass1234!",
        "full_name": "New User",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@x.com"
    assert "id" in data
    assert "hashed_password" not in data


async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@x.com", "password": "Pass1234!", "full_name": "A"}
    await client.post("/auth/register", json=payload)
    resp = await client.post("/auth/register", json=payload)
    assert resp.status_code == 400


async def test_register_missing_fields(client: AsyncClient):
    resp = await client.post("/auth/register", json={"email": "bad@x.com"})
    assert resp.status_code == 422


async def test_login_success(client: AsyncClient):
    await client.post("/auth/register", json={
        "email": "login@x.com", "password": "Pass1234!", "full_name": "L",
    })
    resp = await client.post("/auth/login", json={"email": "login@x.com", "password": "Pass1234!"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient):
    await client.post("/auth/register", json={
        "email": "wp@x.com", "password": "Pass1234!", "full_name": "W",
    })
    resp = await client.post("/auth/login", json={"email": "wp@x.com", "password": "wrong"})
    assert resp.status_code == 401


async def test_login_unknown_user(client: AsyncClient):
    resp = await client.post("/auth/login", json={"email": "nobody@x.com", "password": "x"})
    assert resp.status_code == 401


async def test_protected_route_without_token(client: AsyncClient):
    resp = await client.get("/users/me")
    assert resp.status_code == 401


async def test_protected_route_with_token(client: AsyncClient):
    from tests.conftest import auth, register_and_login
    token = await register_and_login(client, "me@x.com", "Pass1234!")
    resp = await client.get("/users/me", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@x.com"
