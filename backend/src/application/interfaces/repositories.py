"""Abstract repository interfaces (ports) for all aggregates."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar
from uuid import UUID

from src.domain.auth.entities import User
from src.domain.lms.entities import (
    Direction,
    Group,
    Lesson,
    Payment,
    Room,
    Student,
    Subject,
)
from src.domain.crm.entities import CrmTask, Funnel, Lead, Stage

T = TypeVar("T")


@dataclass
class Page(Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int

    @property
    def pages(self) -> int:
        return (self.total + self.page_size - 1) // self.page_size


# ─── Auth ───────────────────────────────────────────────────────────────────

class UserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def save(self, user: User) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        role: str | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[User]: ...


# ─── LMS ────────────────────────────────────────────────────────────────────

class StudentRepository(ABC):
    @abstractmethod
    async def get_by_id(self, student_id: UUID) -> Student | None: ...

    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> Student | None: ...

    @abstractmethod
    async def save(self, student: Student) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        direction_id: UUID | None = None,
        risk_level: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Student]: ...

    @abstractmethod
    async def get_by_group(self, group_id: UUID) -> list[Student]: ...


class DirectionRepository(ABC):
    @abstractmethod
    async def get_by_id(self, direction_id: UUID) -> Direction | None: ...

    @abstractmethod
    async def save(self, direction: Direction) -> None: ...

    @abstractmethod
    async def list(self, *, is_active: bool | None = None) -> list[Direction]: ...


class SubjectRepository(ABC):
    @abstractmethod
    async def get_by_id(self, subject_id: UUID) -> Subject | None: ...

    @abstractmethod
    async def save(self, subject: Subject) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        direction_id: UUID | None = None,
        teacher_id: UUID | None = None,
        is_active: bool | None = None,
    ) -> list[Subject]: ...


class RoomRepository(ABC):
    @abstractmethod
    async def get_by_id(self, room_id: UUID) -> Room | None: ...

    @abstractmethod
    async def save(self, room: Room) -> None: ...

    @abstractmethod
    async def list(self, *, is_active: bool | None = None) -> list[Room]: ...


class GroupRepository(ABC):
    @abstractmethod
    async def get_by_id(self, group_id: UUID) -> Group | None: ...

    @abstractmethod
    async def save(self, group: Group) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        subject_id: UUID | None = None,
        teacher_id: UUID | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Group]: ...


class LessonRepository(ABC):
    @abstractmethod
    async def get_by_id(self, lesson_id: UUID) -> Lesson | None: ...

    @abstractmethod
    async def save(self, lesson: Lesson) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        group_id: UUID | None = None,
        teacher_id: UUID | None = None,
        status: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Lesson]: ...


class PaymentRepository(ABC):
    @abstractmethod
    async def get_by_id(self, payment_id: UUID) -> Payment | None: ...

    @abstractmethod
    async def save(self, payment: Payment) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        student_id: UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Payment]: ...


# ─── CRM ────────────────────────────────────────────────────────────────────

class FunnelRepository(ABC):
    @abstractmethod
    async def get_by_id(self, funnel_id: UUID) -> Funnel | None: ...

    @abstractmethod
    async def save(self, funnel: Funnel) -> None: ...

    @abstractmethod
    async def list(self, *, is_archived: bool | None = None) -> list[Funnel]: ...


class StageRepository(ABC):
    @abstractmethod
    async def get_by_id(self, stage_id: UUID) -> Stage | None: ...

    @abstractmethod
    async def save(self, stage: Stage) -> None: ...

    @abstractmethod
    async def get_by_funnel(self, funnel_id: UUID) -> list[Stage]: ...


class LeadRepository(ABC):
    @abstractmethod
    async def get_by_id(self, lead_id: UUID) -> Lead | None: ...

    @abstractmethod
    async def save(self, lead: Lead) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        funnel_id: UUID | None = None,
        stage_id: UUID | None = None,
        assigned_to: UUID | None = None,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Lead]: ...


class CrmTaskRepository(ABC):
    @abstractmethod
    async def get_by_id(self, task_id: UUID) -> CrmTask | None: ...

    @abstractmethod
    async def save(self, task: CrmTask) -> None: ...

    @abstractmethod
    async def list(
        self,
        *,
        assigned_to: UUID | None = None,
        lead_id: UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[CrmTask]: ...
