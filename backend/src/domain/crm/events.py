from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.events import DomainEvent


@dataclass(frozen=True)
class LeadCreatedEvent(DomainEvent):
    lead_id: UUID = None  # type: ignore[assignment]
    assigned_to: UUID | None = None


@dataclass(frozen=True)
class LeadWonEvent(DomainEvent):
    lead_id: UUID = None  # type: ignore[assignment]


@dataclass(frozen=True)
class LeadLostEvent(DomainEvent):
    lead_id: UUID = None  # type: ignore[assignment]
    reason: str = ""


@dataclass(frozen=True)
class LeadStageMovedEvent(DomainEvent):
    lead_id: UUID = None  # type: ignore[assignment]
    from_stage_id: UUID | None = None
    to_stage_id: UUID = None  # type: ignore[assignment]
    changed_by: UUID = None  # type: ignore[assignment]


@dataclass(frozen=True)
class LeadAssignedEvent(DomainEvent):
    lead_id: UUID = None  # type: ignore[assignment]
    from_user_id: UUID = None  # type: ignore[assignment]
    to_user_id: UUID = None  # type: ignore[assignment]
