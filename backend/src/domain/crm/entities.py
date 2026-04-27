from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID

from src.domain.crm.events import (
    LeadCreatedEvent,
    LeadLostEvent,
    LeadStageMovedEvent,
    LeadWonEvent,
)
from src.domain.crm.value_objects import HexColor, WinProbability
from src.domain.shared.entity import AggregateRoot
from src.domain.shared.value_objects import Phone


class LeadStatus(StrEnum):
    ACTIVE = "active"
    WON = "won"
    LOST = "lost"


class LeadSourceType(StrEnum):
    MANUAL = "manual"
    IMPORT = "import"
    API = "api"
    LANDING = "landing"


class ActivityType(StrEnum):
    CALL = "call"
    MEETING = "meeting"
    MESSAGE = "message"
    OTHER = "other"


class TaskPriority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    OVERDUE = "overdue"


# ── Lead ──────────────────────────────────────────────────────────────────────


@dataclass
class Lead(AggregateRoot):
    full_name: str = ""
    phone: str = ""
    email: str | None = None
    source_id: UUID | None = None
    funnel_id: UUID | None = None
    stage_id: UUID | None = None
    assigned_to: UUID | None = None
    status: LeadStatus = LeadStatus.ACTIVE
    lost_reason: str | None = None
    custom_fields: dict = field(default_factory=dict)  # type: ignore[type-arg]

    @classmethod
    def create(
        cls,
        full_name: str,
        phone: str,
        funnel_id: UUID,
        stage_id: UUID,
        assigned_to: UUID | None = None,
        source_id: UUID | None = None,
        email: str | None = None,
    ) -> "Lead":
        Phone(phone)  # validate
        lead = cls(
            full_name=full_name,
            phone=phone,
            email=email,
            source_id=source_id,
            funnel_id=funnel_id,
            stage_id=stage_id,
            assigned_to=assigned_to,
        )
        lead.add_event(LeadCreatedEvent(lead_id=lead.id, assigned_to=assigned_to))
        return lead

    def move_to_stage(self, new_stage_id: UUID, changed_by: UUID) -> None:
        old = self.stage_id
        self.stage_id = new_stage_id
        self.add_event(
            LeadStageMovedEvent(
                lead_id=self.id,
                from_stage_id=old,
                to_stage_id=new_stage_id,
                changed_by=changed_by,
            )
        )

    def mark_won(self) -> None:
        from src.domain.crm.policies import LeadTransitionPolicy

        LeadTransitionPolicy.validate_transition(self.status, LeadStatus.WON)
        self.status = LeadStatus.WON
        self.add_event(LeadWonEvent(lead_id=self.id))

    def mark_lost(self, reason: str) -> None:
        if not reason.strip():
            raise ValueError("Lost reason is required")
        from src.domain.crm.policies import LeadTransitionPolicy

        LeadTransitionPolicy.validate_transition(self.status, LeadStatus.LOST)
        self.status = LeadStatus.LOST
        self.lost_reason = reason
        self.add_event(LeadLostEvent(lead_id=self.id, reason=reason))

    def reassign(self, new_user_id: UUID, changed_by: UUID) -> None:
        self.assigned_to = new_user_id


# ── Funnel / Stage ────────────────────────────────────────────────────────────


@dataclass
class Funnel(AggregateRoot):
    name: str = ""
    is_archived: bool = False

    @classmethod
    def create(cls, name: str) -> "Funnel":
        return cls(name=name)

    def archive(self) -> None:
        self.is_archived = True


@dataclass
class Stage(AggregateRoot):
    funnel_id: UUID | None = None
    name: str = ""
    color: HexColor = field(default_factory=lambda: HexColor("#6366F1"))
    win_probability: WinProbability = field(default_factory=lambda: WinProbability(0))
    order: int = 0


# ── CRM Task ──────────────────────────────────────────────────────────────────


@dataclass
class CrmTask(AggregateRoot):
    title: str = ""
    description: str | None = None
    linked_lead_id: UUID | None = None
    assigned_to: UUID | None = None
    due_date: str = ""  # ISO date string
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    reminder_at: str | None = None
    is_auto_created: bool = False

    @classmethod
    def create(
        cls,
        title: str,
        assigned_to: UUID,
        due_date: str,
        priority: TaskPriority = TaskPriority.MEDIUM,
        linked_lead_id: UUID | None = None,
    ) -> "CrmTask":
        if not title.strip():
            raise ValueError("Task title is required")
        return cls(
            title=title,
            assigned_to=assigned_to,
            due_date=due_date,
            priority=priority,
            linked_lead_id=linked_lead_id,
        )

    def complete(self) -> None:
        self.status = TaskStatus.DONE

    def move(self, new_status: TaskStatus) -> None:
        self.status = new_status
