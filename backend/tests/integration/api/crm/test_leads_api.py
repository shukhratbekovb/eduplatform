"""Integration tests — CRM Leads API."""
from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import auth_headers, make_user
from src.domain.auth.entities import UserRole
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository
from src.infrastructure.persistence.models.crm import FunnelModel, StageModel, LeadModel


pytestmark = pytest.mark.asyncio


async def _persist_user(db: AsyncSession, **kwargs):  # type: ignore[no-untyped-def]
    user = make_user(**kwargs)
    repo = SqlUserRepository(db)
    await repo.save(user)
    await db.flush()
    return user


async def _make_funnel_with_stage(db: AsyncSession):  # type: ignore[no-untyped-def]
    funnel = FunnelModel(id=uuid4(), name="Test Funnel", is_archived=False)
    stage = StageModel(
        id=uuid4(),
        funnel_id=funnel.id,
        name="New",
        color="#6366F1",
        win_probability=20,
        order=1,
    )
    db.add(funnel)
    db.add(stage)
    await db.flush()
    return funnel, stage


# ── POST /crm/leads ───────────────────────────────────────────────────────────

class TestCreateLead:
    async def test_sales_manager_can_create(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_lead@test.com", role=UserRole.SALES_MANAGER)
        funnel, stage = await _make_funnel_with_stage(db_session)

        resp = await client.post(
            "/api/v1/crm/leads/",
            json={
                "full_name": "Potential Student",
                "phone": "+998901234567",
                "funnel_id": str(funnel.id),
                "stage_id": str(stage.id),
                "assigned_to": str(manager.id),
            },
            headers=auth_headers(manager),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["full_name"] == "Potential Student"
        assert data["status"] == "active"

    async def test_invalid_stage_raises(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_bad_stage@test.com", role=UserRole.SALES_MANAGER)
        funnel, _ = await _make_funnel_with_stage(db_session)

        resp = await client.post(
            "/api/v1/crm/leads/",
            json={
                "full_name": "Lead",
                "phone": "+998901234567",
                "funnel_id": str(funnel.id),
                "stage_id": str(uuid4()),  # non-existent
                "assigned_to": str(manager.id),
            },
            headers=auth_headers(manager),
        )
        assert resp.status_code in (400, 404)


# ── GET /crm/leads ────────────────────────────────────────────────────────────

class TestListLeads:
    async def test_returns_list(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_list@test.com", role=UserRole.SALES_MANAGER)
        resp = await client.get("/api/v1/crm/leads/", headers=auth_headers(manager))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ── GET /crm/leads/{id} ───────────────────────────────────────────────────────

class TestGetLead:
    async def test_get_existing(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_get@test.com", role=UserRole.SALES_MANAGER)
        funnel, stage = await _make_funnel_with_stage(db_session)

        lead = LeadModel(
            id=uuid4(),
            full_name="Ali Valiyev",
            phone="+998901234567",
            funnel_id=funnel.id,
            stage_id=stage.id,
            assigned_to=manager.id,
            status="active",
        )
        db_session.add(lead)
        await db_session.flush()

        resp = await client.get(f"/api/v1/crm/leads/{lead.id}", headers=auth_headers(manager))
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Ali Valiyev"

    async def test_missing_returns_404(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_404@test.com", role=UserRole.SALES_MANAGER)
        resp = await client.get(f"/api/v1/crm/leads/{uuid4()}", headers=auth_headers(manager))
        assert resp.status_code == 404


# ── POST /crm/leads/{id}/win ──────────────────────────────────────────────────

class TestWinLead:
    async def test_win_lead(self, client: AsyncClient, db_session: AsyncSession) -> None:
        manager = await _persist_user(db_session, email="mgr_win@test.com", role=UserRole.SALES_MANAGER)
        funnel, stage = await _make_funnel_with_stage(db_session)

        lead = LeadModel(
            id=uuid4(),
            full_name="Win Me",
            phone="+998901234567",
            funnel_id=funnel.id,
            stage_id=stage.id,
            assigned_to=manager.id,
            status="active",
        )
        db_session.add(lead)
        await db_session.flush()

        resp = await client.post(f"/api/v1/crm/leads/{lead.id}/win", headers=auth_headers(manager))
        assert resp.status_code == 200
        assert resp.json()["status"] == "won"
