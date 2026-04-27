"""Integration tests -- CRM Funnels API (funnels, stages, custom fields)."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.models.crm import FunnelModel, StageModel
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from tests.conftest import auth_headers, make_user

pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.commit()
    return user


async def _make_funnel(db: AsyncSession, name: str = "Test Funnel"):  # type: ignore[no-untyped-def]
    funnel = FunnelModel(
        id=uuid4(),
        name=name,
        is_archived=False,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(funnel)
    await db.commit()
    return funnel


# ── POST /crm/funnels ───────────────────────────────────────────────────────


class TestCreateFunnel:
    async def test_create(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cfun@test.com", role=UserRole.DIRECTOR)

        resp = await client.post(
            "/api/v1/crm/funnels",
            json={"name": "Sales Pipeline"},
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Sales Pipeline"
        assert data["isArchived"] is False

    async def test_sales_manager_can_create(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_cfun@test.com", role=UserRole.SALES_MANAGER)

        resp = await client.post(
            "/api/v1/crm/funnels",
            json={"name": "Manager Funnel"},
            headers=auth_headers(manager),
        )
        assert resp.status_code == 201


# ── GET /crm/funnels ────────────────────────────────────────────────────────


class TestListFunnels:
    async def test_list(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_lfun@test.com", role=UserRole.DIRECTOR)
        await _make_funnel(db_session, name="Funnel A")

        resp = await client.get("/api/v1/crm/funnels", headers=auth_headers(director))
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


# ── POST /crm/funnels/{id}/stages ───────────────────────────────────────────


class TestCreateStage:
    async def test_create_stage(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_cstg@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        resp = await client.post(
            f"/api/v1/crm/funnels/{funnel.id}/stages",
            json={
                "name": "Qualification",
                "color": "#F59E0B",
                "winProbability": 30,
                "order": 1,
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Qualification"
        assert data["color"] == "#F59E0B"
        assert data["winProbability"] == 30
        assert data["order"] == 1


# ── GET /crm/funnels/{id}/stages ────────────────────────────────────────────


class TestListStages:
    async def test_list_stages(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_lstg@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        # Add a stage directly
        stage = StageModel(
            id=uuid4(),
            funnel_id=funnel.id,
            name="Initial",
            color="#6366F1",
            win_probability=10,
            order=0,
        )
        db_session.add(stage)
        await db_session.commit()

        resp = await client.get(
            f"/api/v1/crm/funnels/{funnel.id}/stages",
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == "Initial"


# ── POST /crm/funnels/{id}/custom-fields ────────────────────────────────────


class TestCreateCustomField:
    async def test_create_text_field(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_ccf1@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        resp = await client.post(
            f"/api/v1/crm/funnels/{funnel.id}/custom-fields",
            json={"label": "Comment", "type": "text", "order": 0},
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["label"] == "Comment"
        assert data["type"] == "text"
        assert data["isActive"] is True

    async def test_create_select_field(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_ccf2@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        resp = await client.post(
            f"/api/v1/crm/funnels/{funnel.id}/custom-fields",
            json={
                "label": "Direction",
                "type": "select",
                "options": {"choices": ["Python", "JS", "Java"]},
                "order": 1,
            },
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "select"
        assert data["options"]["choices"] == ["Python", "JS", "Java"]

    async def test_create_number_field(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_ccf3@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        resp = await client.post(
            f"/api/v1/crm/funnels/{funnel.id}/custom-fields",
            json={"label": "Age", "type": "number", "order": 2},
            headers=auth_headers(director),
        )
        assert resp.status_code == 201
        assert resp.json()["type"] == "number"


# ── GET /crm/funnels/{id}/custom-fields ─────────────────────────────────────


class TestListCustomFields:
    async def test_list_custom_fields(self, client: AsyncClient, db_session: AsyncSession) -> None:
        director = await _persist_user(db_session, email="dir_lcf@test.com", role=UserRole.DIRECTOR)
        funnel = await _make_funnel(db_session)

        # Create a field first
        from src.infrastructure.persistence.models.crm import CustomFieldModel

        cf = CustomFieldModel(
            id=uuid4(),
            funnel_id=funnel.id,
            label="Test Field",
            type="text",
            options=None,
            order=0,
            is_active=True,
            created_at=datetime.now(UTC),
        )
        db_session.add(cf)
        await db_session.commit()

        resp = await client.get(
            f"/api/v1/crm/funnels/{funnel.id}/custom-fields",
            headers=auth_headers(director),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["label"] == "Test Field"
