from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.events import DomainEvent


@dataclass(frozen=True)
class LessonConductedEvent(DomainEvent):
    lesson_id: UUID = None  # type: ignore[assignment]
    group_id: UUID = None   # type: ignore[assignment]
    teacher_id: UUID | None = None


@dataclass(frozen=True)
class LessonCancelledEvent(DomainEvent):
    lesson_id: UUID = None  # type: ignore[assignment]
    group_id: UUID = None   # type: ignore[assignment]
    reason: str = ""


@dataclass(frozen=True)
class StudentRiskChangedEvent(DomainEvent):
    student_id: UUID = None  # type: ignore[assignment]
    old_level: str = ""
    new_level: str = ""


@dataclass(frozen=True)
class StudentEnrolledEvent(DomainEvent):
    student_id: UUID = None  # type: ignore[assignment]
    group_id: UUID = None    # type: ignore[assignment]


@dataclass(frozen=True)
class PaymentReceivedEvent(DomainEvent):
    payment_id: UUID = None   # type: ignore[assignment]
    student_id: UUID = None   # type: ignore[assignment]
    amount: str = ""
