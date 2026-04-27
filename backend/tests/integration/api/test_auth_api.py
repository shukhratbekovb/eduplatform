"""Integration tests — Auth API endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    """Save a domain User to the test DB and return it."""
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


# ── POST /auth/login ──────────────────────────────────────────────────────────


class TestLogin:
    async def test_valid_credentials(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = make_user(email="login_ok@test.com")
        repo = SqlUserRepository(db_session)
        await repo.save(user)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "login_ok@test.com",
                "password": "password123",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "accessToken" in data
        assert "refreshToken" in data

    async def test_wrong_password(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = make_user(email="login_bad@test.com")
        repo = SqlUserRepository(db_session)
        await repo.save(user)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "login_bad@test.com",
                "password": "wrongpassword",
            },
        )
        assert resp.status_code in (401, 403)

    async def test_unknown_email(self, client: AsyncClient) -> None:
        resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nobody@nowhere.com",
                "password": "pass",
            },
        )
        assert resp.status_code in (401, 403)


# ── GET /auth/me ──────────────────────────────────────────────────────────────


class TestGetMe:
    async def test_returns_current_user(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = make_user(email="me_test@test.com", name="Director User")
        repo = SqlUserRepository(db_session)
        await repo.save(user)
        await db_session.commit()

        resp = await client.get("/api/v1/auth/me", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "me_test@test.com"
        assert data["name"] == "Director User"

    async def test_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code in (401, 403)


# ── POST /auth/users ──────────────────────────────────────────────────────────


class TestCreateUser:
    async def test_director_can_create(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = make_user(email="dir_create@test.com", role=UserRole.DIRECTOR)
        repo = SqlUserRepository(db_session)
        await repo.save(director)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/auth/users",
            json={
                "email": "newteacher@test.com",
                "password": "Teacher!Pass1",
                "name": "New Teacher",
                "role": "teacher",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["role"] == "teacher"

    async def test_teacher_cannot_create(self, client: AsyncClient, db_session: AsyncSession) -> None:
        teacher = make_user(email="teacher_nope@test.com", role=UserRole.TEACHER)
        repo = SqlUserRepository(db_session)
        await repo.save(teacher)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/auth/users",
            json={
                "email": "other@test.com",
                "password": "Teacher!Pass1",
                "name": "Other",
                "role": "teacher",
            },
            headers=auth_headers(teacher),
        )
        assert resp.status_code == 403

    async def test_duplicate_email_rejected(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = make_user(email="dir_dup@test.com", role=UserRole.DIRECTOR)
        existing = make_user(email="dup_target@test.com")
        repo = SqlUserRepository(db_session)
        await repo.save(director)
        await repo.save(existing)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/auth/users",
            json={
                "email": "dup_target@test.com",
                "password": "Password!1",
                "name": "Dup",
                "role": "teacher",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 400


# ── POST /auth/refresh ────────────────────────────────────────────────────────


class TestRefresh:
    async def test_refresh_returns_new_tokens(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = make_user(email="refresh_test@test.com")
        repo = SqlUserRepository(db_session)
        await repo.save(user)
        await db_session.commit()

        login_resp = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "refresh_test@test.com",
                "password": "password123",
            },
        )
        refresh_token = login_resp.json()["refreshToken"]

        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "accessToken" in resp.json()

    async def test_invalid_token_rejected(self, client: AsyncClient) -> None:
        resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": "not.a.token"})
        assert resp.status_code in (401, 403)


# ── PATCH /auth/me ───────────────────────────────────────────────────────────


class TestUpdateProfile:
    async def test_update_name(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, email="upd_name@test.com", name="Old Name")

        resp = await client.patch(
            "/api/v1/auth/me",
            json={"name": "New Name"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    async def test_update_phone_and_dob(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, email="upd_phone@test.com")

        resp = await client.patch(
            "/api/v1/auth/me",
            json={"phone": "+998901112233", "date_of_birth": "1995-06-15"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["phone"] == "+998901112233"
        assert data["dateOfBirth"] == "1995-06-15"

    async def test_unauthenticated(self, client: AsyncClient) -> None:
        resp = await client.patch("/api/v1/auth/me", json={"name": "X"})
        assert resp.status_code in (401, 403)


# ── POST /auth/change-password ───────────────────────────────────────────────


class TestChangePassword:
    async def test_success(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, email="chpw_ok@test.com")

        resp = await client.post(
            "/api/v1/auth/change-password",
            json={"old_password": "password123", "new_password": "NewPass!1234"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "Password changed successfully"

        # Verify new password works
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "chpw_ok@test.com", "password": "NewPass!1234"},
        )
        assert login_resp.status_code == 200

    async def test_wrong_old_password(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user = await _persist_user(db_session, email="chpw_bad@test.com")

        resp = await client.post(
            "/api/v1/auth/change-password",
            json={"old_password": "wrongoldpass", "new_password": "NewPass!1234"},
            headers=auth_headers(user),
        )
        assert resp.status_code == 400


# ── GET /auth/users ──────────────────────────────────────────────────────────


class TestListUsers:
    async def test_director_can_list(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_list@test.com", role=UserRole.DIRECTOR)

        resp = await client.get("/api/v1/auth/users", headers=auth_headers(director))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_teacher_cannot_list(self, client: AsyncClient, db_session: AsyncSession) -> None:
        teacher = await _persist_user(db_session, email="teach_list@test.com", role=UserRole.TEACHER)

        resp = await client.get("/api/v1/auth/users", headers=auth_headers(teacher))
        assert resp.status_code == 403

    async def test_filter_by_role(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_filt@test.com", role=UserRole.DIRECTOR)
        await _persist_user(db_session, email="teach_filt@test.com", role=UserRole.TEACHER)

        resp = await client.get(
            "/api/v1/auth/users",
            params={"role": "teacher"},
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert all(u["role"] == "teacher" for u in data)
