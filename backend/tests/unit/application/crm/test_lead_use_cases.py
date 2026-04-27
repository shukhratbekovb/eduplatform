"""Unit tests — CRM Lead use cases (in-memory repos)."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest

from src.application.crm.leads.use_cases import (
    AssignLeadUseCase,
    CreateLeadInput,
    CreateLeadUseCase,
    GetLeadUseCase,
    LoseLeadUseCase,
    MoveLeadStageUseCase,
    WinLeadUseCase,
)
from src.application.interfaces.repositories import Page
from src.domain.crm.entities import Lead, LeadStatus, Stage

# ── In-memory stubs ───────────────────────────────────────────────────────────


class InMemoryLeadRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Lead] = {}

    async def get_by_id(self, lid: Any) -> Lead | None:
        return self._store.get(lid)

    async def save(self, lead: Lead) -> None:
        self._store[lead.id] = lead

    async def list(self, **kw: Any) -> Page[Lead]:
        items = list(self._store.values())
        return Page(items=items, total=len(items), page=1, page_size=20)


class InMemoryStageRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Stage] = {}

    async def get_by_id(self, sid: Any) -> Stage | None:
        return self._store.get(sid)

    async def save(self, stage: Stage) -> None:
        self._store[stage.id] = stage

    async def list(self, **kw: Any) -> Page[Stage]:
        items = list(self._store.values())
        return Page(items=items, total=len(items), page=1, page_size=20)


def _make_stage(funnel_id: Any) -> Stage:
    s = Stage(funnel_id=funnel_id, name="Contacted", win_probability=30)
    return s


def _make_lead_input(funnel_id: Any, stage_id: Any) -> CreateLeadInput:
    return CreateLeadInput(
        full_name="Test Lead",
        phone="+998901234567",
        funnel_id=funnel_id,
        stage_id=stage_id,
        assigned_to=uuid4(),
    )


# ── CreateLeadUseCase ─────────────────────────────────────────────────────────


class TestCreateLeadUseCase:
    async def test_creates_lead(self) -> None:
        leads = InMemoryLeadRepo()
        stages = InMemoryStageRepo()
        funnel_id = uuid4()
        stage = _make_stage(funnel_id)
        await stages.save(stage)

        uc = CreateLeadUseCase(leads, stages)
        lead = await uc.execute(_make_lead_input(funnel_id, stage.id))
        assert lead.full_name == "Test Lead"
        assert lead.status == LeadStatus.ACTIVE

    async def test_missing_stage_raises(self) -> None:
        uc = CreateLeadUseCase(InMemoryLeadRepo(), InMemoryStageRepo())
        with pytest.raises(ValueError, match="Stage"):
            await uc.execute(_make_lead_input(uuid4(), uuid4()))

    async def test_stage_funnel_mismatch_raises(self) -> None:
        stages = InMemoryStageRepo()
        stage = _make_stage(funnel_id=uuid4())  # different funnel
        await stages.save(stage)

        uc = CreateLeadUseCase(InMemoryLeadRepo(), stages)
        with pytest.raises(ValueError, match="funnel"):
            await uc.execute(_make_lead_input(uuid4(), stage.id))


# ── GetLeadUseCase ────────────────────────────────────────────────────────────


class TestGetLeadUseCase:
    async def test_get_existing(self) -> None:
        leads = InMemoryLeadRepo()
        funnel_id = uuid4()
        lead = Lead.create(
            full_name="Ali",
            phone="+998901234567",
            funnel_id=funnel_id,
            stage_id=uuid4(),
            assigned_to=uuid4(),
        )
        lead.pull_events()
        await leads.save(lead)

        uc = GetLeadUseCase(leads)
        result = await uc.execute(lead.id)
        assert result.id == lead.id

    async def test_missing_raises(self) -> None:
        uc = GetLeadUseCase(InMemoryLeadRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())


# ── WinLeadUseCase ────────────────────────────────────────────────────────────


class TestWinLeadUseCase:
    async def _active_lead(self, leads: InMemoryLeadRepo) -> Lead:
        lead = Lead.create(
            full_name="Lead",
            phone="+998901234567",
            funnel_id=uuid4(),
            stage_id=uuid4(),
            assigned_to=uuid4(),
        )
        lead.pull_events()
        await leads.save(lead)
        return lead

    async def test_win(self) -> None:
        leads = InMemoryLeadRepo()
        lead = await self._active_lead(leads)
        uc = WinLeadUseCase(leads)
        result = await uc.execute(lead.id)
        assert result.status == LeadStatus.WON

    async def test_missing_raises(self) -> None:
        uc = WinLeadUseCase(InMemoryLeadRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())


# ── LoseLeadUseCase ───────────────────────────────────────────────────────────


class TestLoseLeadUseCase:
    async def _active_lead(self, leads: InMemoryLeadRepo) -> Lead:
        lead = Lead.create(
            full_name="Lead",
            phone="+998901234567",
            funnel_id=uuid4(),
            stage_id=uuid4(),
            assigned_to=uuid4(),
        )
        lead.pull_events()
        await leads.save(lead)
        return lead

    async def test_lose(self) -> None:
        leads = InMemoryLeadRepo()
        lead = await self._active_lead(leads)
        uc = LoseLeadUseCase(leads)
        result = await uc.execute(lead.id, "Too expensive")
        assert result.status == LeadStatus.LOST
        assert result.lost_reason == "Too expensive"

    async def test_empty_reason_raises(self) -> None:
        leads = InMemoryLeadRepo()
        lead = await self._active_lead(leads)
        uc = LoseLeadUseCase(leads)
        with pytest.raises(ValueError, match="reason"):
            await uc.execute(lead.id, "   ")


# ── MoveLeadStageUseCase ──────────────────────────────────────────────────────


class TestMoveLeadStageUseCase:
    async def test_moves_stage(self) -> None:
        leads = InMemoryLeadRepo()
        stages = InMemoryStageRepo()
        funnel_id = uuid4()

        lead = Lead.create(
            full_name="Lead",
            phone="+998901234567",
            funnel_id=funnel_id,
            stage_id=uuid4(),
            assigned_to=uuid4(),
        )
        lead.pull_events()
        await leads.save(lead)

        new_stage = Stage(funnel_id=funnel_id, name="Qualified", win_probability=50)
        await stages.save(new_stage)

        uc = MoveLeadStageUseCase(leads, stages)
        result = await uc.execute(lead.id, new_stage.id, uuid4())
        assert result.stage_id == new_stage.id


# ── AssignLeadUseCase ─────────────────────────────────────────────────────────


class TestAssignLeadUseCase:
    async def test_assigns(self) -> None:
        leads = InMemoryLeadRepo()
        lead = Lead.create(
            full_name="Lead",
            phone="+998901234567",
            funnel_id=uuid4(),
            stage_id=uuid4(),
            assigned_to=uuid4(),
        )
        lead.pull_events()
        await leads.save(lead)

        new_user = uuid4()
        uc = AssignLeadUseCase(leads)
        result = await uc.execute(lead.id, new_user, uuid4())
        assert result.assigned_to == new_user
