"""Unit tests — CRM Funnel and Stage use cases (in-memory repos)."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest

from src.application.crm.funnels.use_cases import (
    ArchiveFunnelUseCase,
    CreateFunnelUseCase,
    CreateStageInput,
    CreateStageUseCase,
    ListFunnelsUseCase,
    ListStagesUseCase,
)
from src.domain.crm.entities import Funnel, Stage

# ── In-memory stubs ───────────────────────────────────────────────────────────


class InMemoryFunnelRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Funnel] = {}

    async def get_by_id(self, funnel_id: Any) -> Funnel | None:
        return self._store.get(funnel_id)

    async def save(self, funnel: Funnel) -> None:
        self._store[funnel.id] = funnel

    async def list(self, *, is_archived: bool | None = None) -> list[Funnel]:
        items = list(self._store.values())
        if is_archived is not None:
            items = [f for f in items if f.is_archived == is_archived]
        return items


class InMemoryStageRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Stage] = {}

    async def get_by_id(self, stage_id: Any) -> Stage | None:
        return self._store.get(stage_id)

    async def save(self, stage: Stage) -> None:
        self._store[stage.id] = stage

    async def get_by_funnel(self, funnel_id: Any) -> list[Stage]:
        return [s for s in self._store.values() if s.funnel_id == funnel_id]


# ── CreateFunnelUseCase ──────────────────────────────────────────────────────


class TestCreateFunnelUseCase:
    async def test_creates_funnel(self) -> None:
        repo = InMemoryFunnelRepo()
        uc = CreateFunnelUseCase(repo)
        funnel = await uc.execute("Sales Pipeline")
        assert funnel.name == "Sales Pipeline"
        assert not funnel.is_archived
        saved = await repo.get_by_id(funnel.id)
        assert saved is not None

    async def test_empty_name_raises(self) -> None:
        uc = CreateFunnelUseCase(InMemoryFunnelRepo())
        with pytest.raises(ValueError, match="required"):
            await uc.execute("")

    async def test_whitespace_name_raises(self) -> None:
        uc = CreateFunnelUseCase(InMemoryFunnelRepo())
        with pytest.raises(ValueError, match="required"):
            await uc.execute("   ")


# ── ListFunnelsUseCase ───────────────────────────────────────────────────────


class TestListFunnelsUseCase:
    async def test_list_all(self) -> None:
        repo = InMemoryFunnelRepo()
        f1 = Funnel.create("Active")
        f2 = Funnel.create("Archived")
        f2.archive()
        await repo.save(f1)
        await repo.save(f2)

        uc = ListFunnelsUseCase(repo)
        result = await uc.execute()
        assert len(result) == 2

    async def test_list_archived_only(self) -> None:
        repo = InMemoryFunnelRepo()
        f1 = Funnel.create("Active")
        f2 = Funnel.create("Archived")
        f2.archive()
        await repo.save(f1)
        await repo.save(f2)

        uc = ListFunnelsUseCase(repo)
        result = await uc.execute(is_archived=True)
        assert len(result) == 1
        assert result[0].name == "Archived"

    async def test_list_not_archived(self) -> None:
        repo = InMemoryFunnelRepo()
        f1 = Funnel.create("Active")
        f2 = Funnel.create("Archived")
        f2.archive()
        await repo.save(f1)
        await repo.save(f2)

        uc = ListFunnelsUseCase(repo)
        result = await uc.execute(is_archived=False)
        assert len(result) == 1
        assert result[0].name == "Active"

    async def test_list_empty(self) -> None:
        uc = ListFunnelsUseCase(InMemoryFunnelRepo())
        result = await uc.execute()
        assert result == []


# ── ArchiveFunnelUseCase ─────────────────────────────────────────────────────


class TestArchiveFunnelUseCase:
    async def test_archives_funnel(self) -> None:
        repo = InMemoryFunnelRepo()
        funnel = Funnel.create("My Funnel")
        await repo.save(funnel)

        uc = ArchiveFunnelUseCase(repo)
        result = await uc.execute(funnel.id)
        assert result.is_archived is True

    async def test_missing_funnel_raises(self) -> None:
        uc = ArchiveFunnelUseCase(InMemoryFunnelRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())


# ── CreateStageUseCase ───────────────────────────────────────────────────────


class TestCreateStageUseCase:
    async def test_creates_stage(self) -> None:
        funnels = InMemoryFunnelRepo()
        stages = InMemoryStageRepo()
        funnel = Funnel.create("Pipeline")
        await funnels.save(funnel)

        uc = CreateStageUseCase(stages, funnels)
        stage = await uc.execute(
            CreateStageInput(
                funnel_id=funnel.id,
                name="New Lead",
                color="#FF0000",
                win_probability=10,
                order=1,
            )
        )
        assert stage.name == "New Lead"
        assert stage.funnel_id == funnel.id
        assert stage.order == 1
        saved = await stages.get_by_id(stage.id)
        assert saved is not None

    async def test_missing_funnel_raises(self) -> None:
        uc = CreateStageUseCase(InMemoryStageRepo(), InMemoryFunnelRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(
                CreateStageInput(funnel_id=uuid4(), name="Stage")
            )


# ── ListStagesUseCase ────────────────────────────────────────────────────────


class TestListStagesUseCase:
    async def test_list_stages_for_funnel(self) -> None:
        stages = InMemoryStageRepo()
        funnel_id = uuid4()
        other_funnel_id = uuid4()

        s1 = Stage(funnel_id=funnel_id, name="Stage 1")
        s2 = Stage(funnel_id=funnel_id, name="Stage 2")
        s3 = Stage(funnel_id=other_funnel_id, name="Other Stage")
        await stages.save(s1)
        await stages.save(s2)
        await stages.save(s3)

        uc = ListStagesUseCase(stages)
        result = await uc.execute(funnel_id)
        assert len(result) == 2

    async def test_list_empty(self) -> None:
        uc = ListStagesUseCase(InMemoryStageRepo())
        result = await uc.execute(uuid4())
        assert result == []
