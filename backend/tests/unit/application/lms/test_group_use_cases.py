"""Unit tests — LMS Group use cases (in-memory repos)."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import uuid4

import pytest

from src.application.interfaces.repositories import Page
from src.application.lms.groups.use_cases import (
    CreateGroupInput,
    CreateGroupUseCase,
    GetGroupUseCase,
    ListGroupsUseCase,
    UpdateGroupInput,
    UpdateGroupUseCase,
)
from src.domain.lms.entities import Group

# ── In-memory stub ───────────────────────────────────────────────────────────


class InMemoryGroupRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Group] = {}

    async def get_by_id(self, group_id: Any) -> Group | None:
        return self._store.get(group_id)

    async def save(self, group: Group) -> None:
        self._store[group.id] = group

    async def list(self, **kw: Any) -> Page[Group]:
        items = list(self._store.values())
        is_active = kw.get("is_active")
        if is_active is not None:
            items = [g for g in items if g.is_active == is_active]
        page = kw.get("page", 1)
        page_size = kw.get("page_size", 20)
        return Page(items=items, total=len(items), page=page, page_size=page_size)


# ── CreateGroupUseCase ───────────────────────────────────────────────────────


class TestCreateGroupUseCase:
    async def test_creates_group(self) -> None:
        repo = InMemoryGroupRepo()
        uc = CreateGroupUseCase(repo)
        group = await uc.execute(
            CreateGroupInput(name="PY-101", start_date=date(2026, 1, 15))
        )
        assert group.name == "PY-101"
        assert group.start_date == date(2026, 1, 15)
        saved = await repo.get_by_id(group.id)
        assert saved is not None

    async def test_creates_group_with_schedule(self) -> None:
        repo = InMemoryGroupRepo()
        uc = CreateGroupUseCase(repo)
        schedule = {"mon": "09:00-10:30", "wed": "09:00-10:30"}
        group = await uc.execute(
            CreateGroupInput(name="JS-201", schedule=schedule)
        )
        assert group.schedule == schedule

    async def test_creates_group_defaults(self) -> None:
        repo = InMemoryGroupRepo()
        uc = CreateGroupUseCase(repo)
        group = await uc.execute(CreateGroupInput(name="Default"))
        assert group.schedule == {}
        assert group.start_date is None
        assert group.end_date is None


# ── GetGroupUseCase ──────────────────────────────────────────────────────────


class TestGetGroupUseCase:
    async def test_get_existing(self) -> None:
        repo = InMemoryGroupRepo()
        g = Group.create("Test Group")
        await repo.save(g)

        uc = GetGroupUseCase(repo)
        result = await uc.execute(g.id)
        assert result.name == "Test Group"

    async def test_missing_raises(self) -> None:
        uc = GetGroupUseCase(InMemoryGroupRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())


# ── ListGroupsUseCase ────────────────────────────────────────────────────────


class TestListGroupsUseCase:
    async def test_list_all(self) -> None:
        repo = InMemoryGroupRepo()
        g1 = Group.create("G1")
        g2 = Group.create("G2")
        await repo.save(g1)
        await repo.save(g2)

        uc = ListGroupsUseCase(repo)
        page = await uc.execute()
        assert page.total == 2
        assert len(page.items) == 2

    async def test_list_active_only(self) -> None:
        repo = InMemoryGroupRepo()
        g1 = Group.create("Active")
        g2 = Group.create("Inactive")
        g2.is_active = False
        await repo.save(g1)
        await repo.save(g2)

        uc = ListGroupsUseCase(repo)
        page = await uc.execute(is_active=True)
        assert page.total == 1
        assert page.items[0].name == "Active"

    async def test_list_with_pagination(self) -> None:
        repo = InMemoryGroupRepo()
        for i in range(5):
            await repo.save(Group.create(f"G{i}"))

        uc = ListGroupsUseCase(repo)
        page = await uc.execute(page=1, page_size=10)
        assert page.page == 1
        assert page.page_size == 10

    async def test_list_empty(self) -> None:
        uc = ListGroupsUseCase(InMemoryGroupRepo())
        page = await uc.execute()
        assert page.total == 0
        assert page.items == []


# ── UpdateGroupUseCase ───────────────────────────────────────────────────────


class TestUpdateGroupUseCase:
    async def test_update_name(self) -> None:
        repo = InMemoryGroupRepo()
        g = Group.create("Old Name")
        await repo.save(g)

        uc = UpdateGroupUseCase(repo)
        result = await uc.execute(g.id, UpdateGroupInput(name="New Name"))
        assert result.name == "New Name"

    async def test_update_schedule(self) -> None:
        repo = InMemoryGroupRepo()
        g = Group.create("G1")
        await repo.save(g)

        new_schedule = {"tue": "14:00-15:30"}
        uc = UpdateGroupUseCase(repo)
        result = await uc.execute(g.id, UpdateGroupInput(schedule=new_schedule))
        assert result.schedule == new_schedule

    async def test_update_is_active(self) -> None:
        repo = InMemoryGroupRepo()
        g = Group.create("G1")
        await repo.save(g)

        uc = UpdateGroupUseCase(repo)
        result = await uc.execute(g.id, UpdateGroupInput(is_active=False))
        assert result.is_active is False

    async def test_update_partial_no_change(self) -> None:
        repo = InMemoryGroupRepo()
        g = Group.create("G1")
        g.schedule = {"mon": "09:00"}
        await repo.save(g)

        uc = UpdateGroupUseCase(repo)
        result = await uc.execute(g.id, UpdateGroupInput(name="Updated"))
        assert result.name == "Updated"
        assert result.schedule == {"mon": "09:00"}  # unchanged

    async def test_missing_raises(self) -> None:
        uc = UpdateGroupUseCase(InMemoryGroupRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4(), UpdateGroupInput(name="X"))
