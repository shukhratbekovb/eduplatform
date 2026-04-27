"""Integration tests — Notifications API endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.lms import LmsNotificationModel
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _persist_user(db: AsyncSession, **kwargs):
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


async def _create_lms_notification(db: AsyncSession, user_id, *, is_read: bool = False, title: str = "Test Notif"):
    notif = LmsNotificationModel(
        id=uuid4(),
        user_id=user_id,
        type="notification",
        title=title,
        body="Test body",
        is_read=is_read,
        created_at=datetime.now(UTC),
    )
    db.add(notif)
    await db.commit()
    return notif


# ── GET /notifications ───────────────────────────────────────────────────────


class TestListNotifications:
    async def test_returns_user_notifications(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_dir@test.com")
        await _create_lms_notification(db_session, user.id, title="Notif 1")
        await _create_lms_notification(db_session, user.id, title="Notif 2")

        resp = await client.get("/api/v1/notifications", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        titles = {n["title"] for n in data}
        assert "Notif 1" in titles
        assert "Notif 2" in titles

    async def test_unread_only_filter(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_unread@test.com")
        await _create_lms_notification(db_session, user.id, title="Unread", is_read=False)
        await _create_lms_notification(db_session, user.id, title="Read", is_read=True)

        resp = await client.get("/api/v1/notifications?unreadOnly=true", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["title"] == "Unread"
        assert data[0]["isRead"] is False

    async def test_empty_for_new_user(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, role=UserRole.TEACHER, email="notif_empty@test.com")

        resp = await client.get("/api/v1/notifications", headers=auth_headers(user))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_does_not_leak_other_users(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user1 = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_u1@test.com")
        user2 = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_u2@test.com")
        await _create_lms_notification(db_session, user1.id, title="User1 Only")

        resp = await client.get("/api/v1/notifications", headers=auth_headers(user2))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/notifications")
        assert resp.status_code in (401, 403)


# ── POST /notifications/{id}/read ────────────────────────────────────────────


class TestMarkRead:
    async def test_mark_notification_as_read(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_mark@test.com")
        notif = await _create_lms_notification(db_session, user.id, title="To Read", is_read=False)

        resp = await client.post(f"/api/v1/notifications/{notif.id}/read", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["isRead"] is True
        assert data["title"] == "To Read"

    async def test_mark_nonexistent_returns_404(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_404@test.com")

        resp = await client.post(f"/api/v1/notifications/{uuid4()}/read", headers=auth_headers(user))
        assert resp.status_code == 404

    async def test_cannot_mark_other_users_notification(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user1 = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_own1@test.com")
        user2 = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_own2@test.com")
        notif = await _create_lms_notification(db_session, user1.id, title="Not yours")

        resp = await client.post(f"/api/v1/notifications/{notif.id}/read", headers=auth_headers(user2))
        assert resp.status_code == 404


# ── POST /notifications/read-all ─────────────────────────────────────────────


class TestMarkAllRead:
    async def test_marks_all_as_read(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_all@test.com")
        await _create_lms_notification(db_session, user.id, title="N1", is_read=False)
        await _create_lms_notification(db_session, user.id, title="N2", is_read=False)

        resp = await client.post("/api/v1/notifications/read-all", headers=auth_headers(user))
        assert resp.status_code == 204

        # Verify all are now read
        resp2 = await client.get("/api/v1/notifications?unreadOnly=true", headers=auth_headers(user))
        assert resp2.status_code == 200
        assert resp2.json() == []

    async def test_read_all_idempotent(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, role=UserRole.DIRECTOR, email="notif_idem@test.com")

        resp = await client.post("/api/v1/notifications/read-all", headers=auth_headers(user))
        assert resp.status_code == 204
