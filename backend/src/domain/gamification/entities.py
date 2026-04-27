from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID

from src.domain.gamification.events import AchievementUnlockedEvent
from src.domain.gamification.value_objects import Reward
from src.domain.shared.entity import AggregateRoot


class AchievementCategory(StrEnum):
    ACADEMIC = "academic"
    ATTENDANCE = "attendance"
    ACTIVITY = "activity"
    SOCIAL = "social"
    SPECIAL = "special"


@dataclass
class Achievement(AggregateRoot):
    name: str = ""
    description: str = ""
    category: AchievementCategory = AchievementCategory.ACADEMIC
    icon: str = ""
    reward: Reward = field(default_factory=Reward)
    trigger_type: str | None = None  # e.g. "attendance_streak", "grade_12"
    trigger_value: int | None = None  # threshold
    is_active: bool = True

    # Backward-compatible accessors
    @property
    def reward_stars(self) -> int:
        return self.reward.stars

    @property
    def reward_crystals(self) -> int:
        return self.reward.crystals

    @classmethod
    def create(
        cls,
        name: str,
        description: str,
        category: AchievementCategory,
        reward_stars: int = 0,
        reward_crystals: int = 0,
        icon: str = "",
    ) -> "Achievement":
        return cls(
            name=name,
            description=description,
            category=category,
            reward=Reward(stars=reward_stars, crystals=reward_crystals),
            icon=icon,
        )


@dataclass
class StudentAchievement(AggregateRoot):
    """Связь студент ↔ достижение с датой разблокировки."""

    student_id: UUID | None = None
    achievement_id: UUID | None = None

    @classmethod
    def unlock(cls, student_id: UUID, achievement_id: UUID) -> "StudentAchievement":
        sa = cls(student_id=student_id, achievement_id=achievement_id)
        sa.add_event(
            AchievementUnlockedEvent(
                student_id=student_id,
                achievement_id=achievement_id,
            )
        )
        return sa
