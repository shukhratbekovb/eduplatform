"""LMS Group use cases."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID, uuid4

from src.application.interfaces.repositories import GroupRepository, Page
from src.domain.lms.entities import Group


@dataclass
class CreateGroupInput:
    name: str
    room_id: UUID | None = None
    max_students: int | None = None
    price_per_month: float = 0.0
    start_date: date | None = None
    end_date: date | None = None
    schedule: dict | None = None  # type: ignore[type-arg]


class CreateGroupUseCase:
    def __init__(self, groups: GroupRepository) -> None:
        self._groups = groups

    async def execute(self, inp: CreateGroupInput) -> Group:
        group = Group.create(name=inp.name)
        group.start_date = inp.start_date
        group.end_date = inp.end_date
        group.schedule = inp.schedule or {}
        await self._groups.save(group)
        return group


class GetGroupUseCase:
    def __init__(self, groups: GroupRepository) -> None:
        self._groups = groups

    async def execute(self, group_id: UUID) -> Group:
        group = await self._groups.get_by_id(group_id)
        if group is None:
            raise ValueError(f"Group {group_id} not found")
        return group


class ListGroupsUseCase:
    def __init__(self, groups: GroupRepository) -> None:
        self._groups = groups

    async def execute(
        self,
        *,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Group]:
        return await self._groups.list(
            is_active=is_active,
            page=page,
            page_size=page_size,
        )


@dataclass
class UpdateGroupInput:
    name: str | None = None
    schedule: dict | None = None  # type: ignore[type-arg]
    is_active: bool | None = None


class UpdateGroupUseCase:
    def __init__(self, groups: GroupRepository) -> None:
        self._groups = groups

    async def execute(self, group_id: UUID, inp: UpdateGroupInput) -> Group:
        group = await self._groups.get_by_id(group_id)
        if group is None:
            raise ValueError(f"Group {group_id} not found")
        if inp.name is not None:
            group.name = inp.name
        if inp.schedule is not None:
            group.schedule = inp.schedule
        if inp.is_active is not None:
            group.is_active = inp.is_active
        await self._groups.save(group)
        return group
