import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base
from src.infrastructure.persistence.models.base import TimestampMixin, UUIDPrimaryKey


class AchievementModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "achievements"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(
        SAEnum("academic", "attendance", "activity", "social", "special", name="ach_category", create_type=False),
        nullable=False,
    )
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    reward_stars: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reward_crystals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    trigger_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    trigger_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class StudentAchievementModel(Base, UUIDPrimaryKey):
    __tablename__ = "student_achievements"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    achievement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("achievements.id", ondelete="CASCADE"),
        nullable=False,
    )
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class StudentActivityEventModel(Base, UUIDPrimaryKey):
    __tablename__ = "student_activity_events"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    type: Mapped[str] = mapped_column(
        SAEnum(
            "stars_earned", "crystals_earned", "homework_graded",
            "attendance", "teacher_reply", "badge_unlocked",
            name="activity_event_type", create_type=False,
        ),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    stars_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    crystals_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    linked_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
