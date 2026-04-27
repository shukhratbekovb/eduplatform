"""Integration tests — Gamification API endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.gamification import (
    AchievementModel,
    ShopItemModel,
)
from src.infrastructure.persistence.models.lms import StudentModel
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


async def _create_student_with_balance(db: AsyncSession, stars: int = 100, crystals: int = 20):
    """Create user (role=student) + StudentModel with given balance."""
    user = make_user(role=UserRole.STUDENT, email=f"gam_student_{uuid4().hex[:6]}@test.com")
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()

    student = StudentModel(
        id=uuid4(),
        user_id=user.id,
        full_name="Gam Student",
        is_active=True,
        risk_level="low",
        stars=stars,
        crystals=crystals,
        coins=0,
        badge_level="bronze",
    )
    db.add(student)
    await db.commit()
    return user, student


# ── GET /gamification/shop ───────────────────────────────────────────────────


class TestListShopItems:
    async def test_returns_active_items(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, role=UserRole.DIRECTOR, email="dir_shop@test.com")

        item = ShopItemModel(
            id=uuid4(),
            name="Sticker Pack",
            category="reward",
            cost_stars=50,
            cost_crystals=0,
            is_active=True,
        )
        db_session.add(item)
        await db_session.commit()

        resp = await client.get("/api/v1/gamification/shop", headers=auth_headers(director))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert any(i["name"] == "Sticker Pack" for i in data)

    async def test_inactive_items_hidden(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, role=UserRole.DIRECTOR, email="dir_shop2@test.com")

        item = ShopItemModel(
            id=uuid4(),
            name="Hidden Item",
            category="reward",
            cost_stars=10,
            cost_crystals=0,
            is_active=False,
        )
        db_session.add(item)
        await db_session.commit()

        resp = await client.get("/api/v1/gamification/shop", headers=auth_headers(director))
        assert resp.status_code == 200
        assert not any(i["name"] == "Hidden Item" for i in resp.json())


# ── POST /gamification/shop ──────────────────────────────────────────────────


class TestCreateShopItem:
    async def test_director_creates_item(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, role=UserRole.DIRECTOR, email="dir_create_shop@test.com")

        resp = await client.post(
            "/api/v1/gamification/shop",
            json={
                "name": "T-Shirt",
                "category": "reward",
                "cost_stars": 200,
                "cost_crystals": 5,
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "T-Shirt"
        assert data["cost_stars"] == 200

    async def test_student_cannot_create_item(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, _ = await _create_student_with_balance(db_session)

        resp = await client.post(
            "/api/v1/gamification/shop",
            json={
                "name": "Forbidden Item",
                "category": "reward",
                "cost_stars": 10,
            },
            headers=auth_headers(user),
        )
        assert resp.status_code == 403


# ── GET /gamification/achievements/catalog ───────────────────────────────────


class TestAchievementCatalog:
    async def test_catalog_returns_achievements(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session)

        ach = AchievementModel(
            id=uuid4(),
            name="First Steps",
            category="academic",
            reward_stars=10,
            reward_crystals=0,
            is_active=True,
        )
        db_session.add(ach)
        await db_session.commit()

        resp = await client.get("/api/v1/gamification/achievements/catalog", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        item = next(a for a in data if a["name"] == "First Steps")
        assert item["is_unlocked"] is False

    async def test_catalog_shows_unlocked(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session)

        from src.infrastructure.persistence.models.gamification import StudentAchievementModel

        ach = AchievementModel(
            id=uuid4(),
            name="GPA Master",
            category="academic",
            reward_stars=20,
            reward_crystals=5,
            is_active=True,
        )
        db_session.add(ach)
        await db_session.commit()

        sa = StudentAchievementModel(
            id=uuid4(),
            student_id=student.id,
            achievement_id=ach.id,
            unlocked_at=datetime.now(UTC),
        )
        db_session.add(sa)
        await db_session.commit()

        resp = await client.get("/api/v1/gamification/achievements/catalog", headers=auth_headers(user))
        assert resp.status_code == 200
        item = next(a for a in resp.json() if a["name"] == "GPA Master")
        assert item["is_unlocked"] is True
        assert item["unlocked_at"] is not None


# ── GET /gamification/leaderboard ────────────────────────────────────────────


class TestLeaderboard:
    async def test_leaderboard_returns_entries(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session, stars=500)

        resp = await client.get("/api/v1/gamification/leaderboard", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["rank"] == 1
        assert "full_name" in data[0]
        assert "stars" in data[0]

    async def test_leaderboard_metric_crystals(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session, stars=10, crystals=999)

        resp = await client.get("/api/v1/gamification/leaderboard?metric=crystals", headers=auth_headers(user))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1


# ── POST /gamification/award ─────────────────────────────────────────────────


class TestAwardStudent:
    async def test_director_awards_stars(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, role=UserRole.DIRECTOR, email="dir_award@test.com")
        _, student = await _create_student_with_balance(db_session, stars=10)

        resp = await client.post(
            "/api/v1/gamification/award",
            json={
                "student_id": str(student.id),
                "stars": 25,
                "crystals": 0,
                "description": "Great job in class",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["stars"] == 35  # 10 + 25

    async def test_award_crystals(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, role=UserRole.DIRECTOR, email="dir_award2@test.com")
        _, student = await _create_student_with_balance(db_session, stars=0, crystals=5)

        resp = await client.post(
            "/api/v1/gamification/award",
            json={
                "student_id": str(student.id),
                "stars": 0,
                "crystals": 10,
                "description": "Bonus crystals",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["crystals"] == 15  # 5 + 10

    async def test_award_nothing_fails(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, role=UserRole.DIRECTOR, email="dir_award3@test.com")
        _, student = await _create_student_with_balance(db_session)

        resp = await client.post(
            "/api/v1/gamification/award",
            json={
                "student_id": str(student.id),
                "stars": 0,
                "crystals": 0,
                "description": "Nothing",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 400

    async def test_award_nonexistent_student(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, role=UserRole.DIRECTOR, email="dir_award4@test.com")

        resp = await client.post(
            "/api/v1/gamification/award",
            json={
                "student_id": str(uuid4()),
                "stars": 5,
                "crystals": 0,
                "description": "Ghost",
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 404

    async def test_student_cannot_award(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session)

        resp = await client.post(
            "/api/v1/gamification/award",
            json={
                "student_id": str(student.id),
                "stars": 5,
                "crystals": 0,
                "description": "Self award",
            },
            headers=auth_headers(user),
        )
        assert resp.status_code == 403


# ── POST /gamification/shop/purchase ─────────────────────────────────────────


class TestPurchase:
    async def test_student_purchases_item(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session, stars=100, crystals=10)

        item = ShopItemModel(
            id=uuid4(),
            name="Certificate",
            category="reward",
            cost_stars=50,
            cost_crystals=0,
            is_active=True,
        )
        db_session.add(item)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/gamification/shop/purchase",
            json={"item_id": str(item.id)},
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["purchased"] is True
        assert data["stars"] == 50  # 100 - 50

    async def test_insufficient_stars(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session, stars=5, crystals=0)

        item = ShopItemModel(
            id=uuid4(),
            name="Expensive Item",
            category="reward",
            cost_stars=1000,
            cost_crystals=0,
            is_active=True,
        )
        db_session.add(item)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/gamification/shop/purchase",
            json={"item_id": str(item.id)},
            headers=auth_headers(user),
        )
        assert resp.status_code == 400

    async def test_out_of_stock(self, client: AsyncClient, db_session: AsyncSession) -> None:
        user, student = await _create_student_with_balance(db_session, stars=100)

        item = ShopItemModel(
            id=uuid4(),
            name="Sold Out",
            category="reward",
            cost_stars=10,
            cost_crystals=0,
            stock=0,
            is_active=True,
        )
        db_session.add(item)
        await db_session.commit()

        resp = await client.post(
            "/api/v1/gamification/shop/purchase",
            json={"item_id": str(item.id)},
            headers=auth_headers(user),
        )
        assert resp.status_code == 400
