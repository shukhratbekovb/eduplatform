from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from src.domain.shared.entity import AggregateRoot
from src.domain.shared.value_objects import Grade, Money, TimeRange
from src.domain.lms.events import (
    LessonConductedEvent,
    LessonCancelledEvent,
    StudentRiskChangedEvent,
)


# ── Enums ─────────────────────────────────────────────────────────────────────

class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class BadgeLevel(StrEnum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


class LessonStatus(StrEnum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AttendanceStatus(StrEnum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class GradeType(StrEnum):
    CLASS = "class"
    INDEPENDENT = "independent"
    CONTROL = "control"
    THEMATIC = "thematic"
    HOMEWORK = "homework"


class HomeworkStatus(StrEnum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    OVERDUE = "overdue"


class PaymentStatus(StrEnum):
    PAID = "paid"
    PENDING = "pending"
    OVERDUE = "overdue"


# ── Student ───────────────────────────────────────────────────────────────────

@dataclass
class Student(AggregateRoot):
    full_name: str = ""
    phone: str | None = None
    email: str | None = None
    date_of_birth: date | None = None
    photo_url: str | None = None
    parent_name: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None
    user_id: UUID | None = None
    is_active: bool = True
    risk_level: RiskLevel = RiskLevel.LOW
    total_coins: int = 0
    stars: int = 0
    crystals: int = 0
    badge_level: BadgeLevel = BadgeLevel.BRONZE
    gpa: Decimal | None = None
    attendance_percent: Decimal | None = None

    @classmethod
    def create(cls, full_name: str, **kwargs: object) -> "Student":
        return cls(full_name=full_name, **kwargs)  # type: ignore[arg-type]

    def recalculate_risk(self) -> None:
        from src.domain.lms.policies import RiskCalculationPolicy

        old = self.risk_level
        new = RiskCalculationPolicy.calculate(self.attendance_percent, self.gpa)

        if new != old:
            self.risk_level = new
            self.add_event(StudentRiskChangedEvent(
                student_id=self.id,
                old_level=old,
                new_level=new,
            ))

    def add_stars(self, amount: int) -> None:
        if amount > 0:
            self.stars += amount

    def add_crystals(self, amount: int) -> None:
        if amount > 0:
            self.crystals += amount

    def add_coins(self, amount: int) -> None:
        self.total_coins += amount


# ── Direction / Subject / Room ────────────────────────────────────────────────

@dataclass
class Direction(AggregateRoot):
    name: str = ""
    description: str | None = None
    is_active: bool = True

    @classmethod
    def create(cls, name: str, description: str | None = None) -> "Direction":
        return cls(name=name, description=description)


@dataclass
class Subject(AggregateRoot):
    name: str = ""
    direction_id: UUID | None = None
    description: str | None = None
    is_active: bool = True

    @classmethod
    def create(cls, name: str, direction_id: UUID | None = None) -> "Subject":
        return cls(name=name, direction_id=direction_id)


@dataclass
class Room(AggregateRoot):
    name: str = ""
    capacity: int | None = None
    is_active: bool = True

    @classmethod
    def create(cls, name: str, capacity: int | None = None) -> "Room":
        return cls(name=name, capacity=capacity)


# ── Group ─────────────────────────────────────────────────────────────────────

@dataclass
class Group(AggregateRoot):
    name: str = ""
    start_date: date | None = None
    end_date: date | None = None
    schedule: dict | None = None  # type: ignore[type-arg]
    is_active: bool = True

    @classmethod
    def create(cls, name: str) -> "Group":
        return cls(name=name)


# ── Lesson ────────────────────────────────────────────────────────────────────

@dataclass
class Lesson(AggregateRoot):
    group_id: UUID = field(default_factory=UUID)  # type: ignore[call-arg]
    subject_id: UUID | None = None
    teacher_id: UUID | None = None
    room_id: UUID | None = None
    lesson_date: date = field(default_factory=date.today)
    start_time: str = "19:00"
    end_time: str = "20:30"
    status: LessonStatus = LessonStatus.SCHEDULED
    is_online: bool = False
    topic: str | None = None
    is_recurring: bool = False
    series_id: UUID | None = None
    cancel_reason: str | None = None

    @classmethod
    def create(
        cls,
        group_id: UUID,
        lesson_date: date,
        start_time: str,
        end_time: str,
        **kwargs: object,
    ) -> "Lesson":
        TimeRange(start_time, end_time)  # validate
        return cls(
            group_id=group_id,
            lesson_date=lesson_date,
            start_time=start_time,
            end_time=end_time,
            **kwargs,  # type: ignore[arg-type]
        )

    def conduct(self, topic: str | None = None) -> None:
        if self.status != LessonStatus.SCHEDULED:
            raise ValueError(f"Cannot conduct lesson with status {self.status}")
        self.status = LessonStatus.COMPLETED
        self.topic = topic
        self.add_event(LessonConductedEvent(
            lesson_id=self.id,
            group_id=self.group_id,
            teacher_id=self.teacher_id,
        ))

    def cancel(self, reason: str) -> None:
        if self.status == LessonStatus.COMPLETED:
            raise ValueError("Cannot cancel a completed lesson")
        if not reason.strip():
            raise ValueError("Cancel reason is required")
        self.status = LessonStatus.CANCELLED
        self.cancel_reason = reason
        self.add_event(LessonCancelledEvent(
            lesson_id=self.id,
            group_id=self.group_id,
            reason=reason,
        ))


# ── Payment ───────────────────────────────────────────────────────────────────

@dataclass
class Payment(AggregateRoot):
    student_id: UUID = field(default_factory=UUID)  # type: ignore[call-arg]
    enrollment_id: UUID | None = None
    period: str = ""
    description: str | None = None
    amount: Money = field(default_factory=lambda: Money(Decimal("0")))
    status: PaymentStatus = PaymentStatus.PENDING
    due_date: date | None = None

    @classmethod
    def create(
        cls,
        student_id: UUID,
        period: str,
        amount: Decimal,
        currency: str = "UZS",
        due_date: date | None = None,
    ) -> "Payment":
        return cls(
            student_id=student_id,
            period=period,
            amount=Money(amount, currency),
            due_date=due_date,
        )

    def mark_paid(self) -> None:
        self.status = PaymentStatus.PAID

    def mark_overdue(self) -> None:
        if self.status == PaymentStatus.PENDING:
            self.status = PaymentStatus.OVERDUE
