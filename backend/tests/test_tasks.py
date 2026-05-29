"""Tasks CRUD: create, read, update, delete, search, inbox, locked."""
import pytest
from httpx import AsyncClient

from tests.conftest import auth, register_and_login

pytestmark = pytest.mark.anyio

TASK_PAYLOAD = {
    "title": "Написать тест",
    "planned_start_at": "2026-05-29T10:00:00+03:00",
    "planned_end_at":   "2026-05-29T11:00:00+03:00",
}

INBOX_PAYLOAD = {"title": "Почитать книгу"}


# ── helpers ──────────────────────────────────────────────────────────────────

async def _create(client, token, payload=None) -> dict:
    r = await client.post("/tasks", json=payload or TASK_PAYLOAD, headers=auth(token))
    assert r.status_code == 201, r.text
    return r.json()


# ── create ───────────────────────────────────────────────────────────────────

async def test_create_scheduled_task(client: AsyncClient):
    token = await register_and_login(client, "ct@x.com")
    task = await _create(client, token)
    assert task["title"] == "Написать тест"
    assert task["planned_start_at"] is not None
    assert task["status"] == "pending"
    assert task["source"] == "user"


async def test_create_inbox_task(client: AsyncClient):
    token = await register_and_login(client, "ci@x.com")
    task = await _create(client, token, INBOX_PAYLOAD)
    assert task["planned_start_at"] is None


async def test_create_task_unauthenticated(client: AsyncClient):
    r = await client.post("/tasks", json=TASK_PAYLOAD)
    assert r.status_code == 401


async def test_create_task_invalid_time_range(client: AsyncClient):
    """end before start must be rejected."""
    token = await register_and_login(client, "inv@x.com")
    r = await client.post("/tasks", json={
        "title": "Bad",
        "planned_start_at": "2026-05-29T12:00:00+03:00",
        "planned_end_at":   "2026-05-29T10:00:00+03:00",
    }, headers=auth(token))
    assert r.status_code == 422


# ── read ─────────────────────────────────────────────────────────────────────

async def test_list_scheduled_tasks(client: AsyncClient):
    token = await register_and_login(client, "ls@x.com")
    await _create(client, token)
    r = await client.get("/tasks", headers=auth(token))
    assert r.status_code == 200
    assert len(r.json()) == 1


async def test_list_inbox(client: AsyncClient):
    token = await register_and_login(client, "li@x.com")
    await _create(client, token, INBOX_PAYLOAD)
    r = await client.get("/tasks/inbox", headers=auth(token))
    assert r.status_code == 200
    assert len(r.json()) == 1


async def test_get_task_by_id(client: AsyncClient):
    token = await register_and_login(client, "gi@x.com")
    task = await _create(client, token)
    r = await client.get(f"/tasks/{task['id']}", headers=auth(token))
    assert r.status_code == 200
    assert r.json()["id"] == task["id"]


async def test_get_task_other_user_returns_404(client: AsyncClient):
    """Task not visible to another user."""
    t1 = await register_and_login(client, "u1@x.com")
    t2 = await register_and_login(client, "u2@x.com")
    task = await _create(client, t1)
    r = await client.get(f"/tasks/{task['id']}", headers=auth(t2))
    assert r.status_code == 404


async def test_search_by_title(client: AsyncClient):
    token = await register_and_login(client, "st@x.com")
    await _create(client, token, {"title": "Изучить Python"})
    await _create(client, token, {"title": "Сходить в спортзал"})
    r = await client.get("/tasks/search?q=Python", headers=auth(token))
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert "Python" in data[0]["title"]


# ── update ───────────────────────────────────────────────────────────────────

async def test_update_task_title(client: AsyncClient):
    token = await register_and_login(client, "ut@x.com")
    task = await _create(client, token)
    r = await client.put(f"/tasks/{task['id']}", json={"title": "Обновлено"}, headers=auth(token))
    assert r.status_code == 200
    assert r.json()["title"] == "Обновлено"


async def test_mark_task_done_sets_completed_at(client: AsyncClient):
    token = await register_and_login(client, "md@x.com")
    task = await _create(client, token)
    r = await client.put(f"/tasks/{task['id']}", json={"status": "done"}, headers=auth(token))
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "done"
    assert data["completed_at"] is not None


async def test_update_locked_task_returns_400(client: AsyncClient, db):
    """Locked tasks must not be editable via the API."""
    import uuid

    from sqlalchemy import update

    from app.tasks.models import Task

    token = await register_and_login(client, "lk@x.com")
    task = await _create(client, token)
    # Force-lock the task directly in DB (simulates source='uni')
    await db.execute(update(Task).where(Task.id == uuid.UUID(task["id"])).values(locked=True))
    await db.commit()

    r = await client.put(f"/tasks/{task['id']}", json={"title": "Изменить"}, headers=auth(token))
    assert r.status_code == 400


# ── delete ───────────────────────────────────────────────────────────────────

async def test_delete_task(client: AsyncClient):
    token = await register_and_login(client, "dt@x.com")
    task = await _create(client, token)
    r = await client.delete(f"/tasks/{task['id']}", headers=auth(token))
    assert r.status_code == 204
    r2 = await client.get(f"/tasks/{task['id']}", headers=auth(token))
    assert r2.status_code == 404


async def test_delete_other_user_task_returns_404(client: AsyncClient):
    t1 = await register_and_login(client, "d1@x.com")
    t2 = await register_and_login(client, "d2@x.com")
    task = await _create(client, t1)
    r = await client.delete(f"/tasks/{task['id']}", headers=auth(t2))
    assert r.status_code == 404
