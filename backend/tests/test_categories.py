"""Categories: seed on register, create custom, list, delete."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth, register_and_login

pytestmark = pytest.mark.anyio


async def test_seed_categories_on_register(client: AsyncClient):
    """After registration, user should have system categories."""
    token = await register_and_login(client, "seed@x.com")
    r = await client.get("/categories", headers=auth(token))
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) > 0
    keys = {c["key"] for c in cats}
    # At minimum these system categories should exist
    assert keys & {"study", "code", "sport", "reading", "fixed", "freelance"}


async def test_create_custom_category(client: AsyncClient):
    token = await register_and_login(client, "cc@x.com")
    r = await client.post("/categories", json={"name": "Личное", "key": "personal", "color": "#ff0000"},
                          headers=auth(token))
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Личное"
    assert data["key"] == "personal"


async def test_categories_isolated_between_users(client: AsyncClient):
    t1 = await register_and_login(client, "iso1@x.com")
    t2 = await register_and_login(client, "iso2@x.com")
    await client.post("/categories", json={"name": "Только у первого", "key": "private_cat", "color": "#000"},
                      headers=auth(t1))
    r = await client.get("/categories", headers=auth(t2))
    keys = {c["key"] for c in r.json()}
    assert "private_cat" not in keys
