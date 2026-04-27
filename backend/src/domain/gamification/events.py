from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.events import DomainEvent


@dataclass(frozen=True)
class AchievementUnlockedEvent(DomainEvent):
    student_id: UUID = None  # type: ignore[assignment]
    achievement_id: UUID = None  # type: ignore[assignment]


@dataclass(frozen=True)
class StarsEarnedEvent(DomainEvent):
    student_id: UUID = None  # type: ignore[assignment]
    amount: int = 0
    reason: str = ""


@dataclass(frozen=True)
class CrystalsEarnedEvent(DomainEvent):
    student_id: UUID = None  # type: ignore[assignment]
    amount: int = 0
    reason: str = ""
