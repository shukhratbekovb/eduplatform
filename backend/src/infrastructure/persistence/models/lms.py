import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, DateTime, Enum as SAEnum,
    ForeignKey, Integer, Numeric, String, Text, Time,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.infrastructure.persistence.models.base import TimestampMixin, UUIDPrimaryKey


# ── Students ──────────────────────────────────────────────────────────────────

class StudentModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "students"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    student_code: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    parent_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    direction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("directions.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    risk_level: Mapped[str] = mapped_column(
        SAEnum("low", "medium", "high", "critical", name="risk_level", create_type=False),
        nullable=False, default="normal", index=True,
    )
    risk_last_updated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    coins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    stars: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    crystals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    badge_level: Mapped[str] = mapped_column(
        SAEnum("bronze", "silver", "gold", "platinum", "diamond", name="badge_level", create_type=False),
        nullable=False, default="none",
    )
    gpa: Mapped[Decimal | None] = mapped_column(Numeric(4, 2), nullable=True)
    attendance_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)


# ── Directions ────────────────────────────────────────────────────────────────

class DirectionModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "directions"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    duration_months: Mapped[int | None] = mapped_column(Integer, nullable=True, default=6)
    total_lessons: Mapped[int | None] = mapped_column(Integer, nullable=True, default=72)


# ── Subjects ──────────────────────────────────────────────────────────────────

class SubjectModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "subjects"

    direction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("directions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Rooms ─────────────────────────────────────────────────────────────────────

class RoomModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "rooms"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Groups ────────────────────────────────────────────────────────────────────

class GroupModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "groups"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    room_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    schedule: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    max_students: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    ended_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Enrollments ───────────────────────────────────────────────────────────────

class EnrollmentModel(Base, UUIDPrimaryKey):
    __tablename__ = "enrollments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    dropped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Lessons ───────────────────────────────────────────────────────────────────

class LessonModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "lessons"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    room_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum("scheduled", "completed", "cancelled", name="lesson_status", create_type=False),
        nullable=False, default="scheduled", index=True,
    )
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    online_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancel_reason: Mapped[str | None] = mapped_column(Text, nullable=True)


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceRecordModel(Base, UUIDPrimaryKey):
    __tablename__ = "attendance_records"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        SAEnum("present", "absent", "late", "excused", name="attendance_status", create_type=False),
        nullable=False, default="present",
    )
    minutes_late: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Grades ────────────────────────────────────────────────────────────────────

class GradeRecordModel(Base, UUIDPrimaryKey):
    __tablename__ = "grade_records"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=True, index=True
    )
    type: Mapped[str] = mapped_column(
        SAEnum("class", "independent", "control", "thematic", "homework", name="grade_type", create_type=False),
        nullable=False, index=True,
    )
    score: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False)
    max_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Diamonds ──────────────────────────────────────────────────────────────────

class DiamondRecordModel(Base, UUIDPrimaryKey):
    __tablename__ = "diamond_records"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    awarded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ── Lesson Materials ──────────────────────────────────────────────────────────

class LessonMaterialModel(Base, UUIDPrimaryKey):
    __tablename__ = "lesson_materials"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(
        SAEnum("pdf", "video", "article", "presentation", name="material_type", create_type=False),
        nullable=False, default="pdf",
    )
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    language: Mapped[str] = mapped_column(
        SAEnum("ru", "en", "uz", name="material_lang", create_type=False),
        nullable=False, default="ru",
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Homework Assignments ──────────────────────────────────────────────────────

class HomeworkAssignmentModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "homework_assignments"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


# ── Homework Submissions ──────────────────────────────────────────────────────

class HomeworkSubmissionModel(Base, UUIDPrimaryKey):
    __tablename__ = "homework_submissions"

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("homework_assignments.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    status: Mapped[str] = mapped_column(
        SAEnum("pending", "submitted", "graded", "overdue", name="homework_status", create_type=False),
        nullable=False, default="pending", index=True,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    s3_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Late Entry Requests ───────────────────────────────────────────────────────

class LateEntryRequestModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "late_entry_requests"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    is_approved: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Coin Transactions ─────────────────────────────────────────────────────────

class CoinTransactionModel(Base, UUIDPrimaryKey):
    __tablename__ = "coin_transactions"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ── MUP Tasks ─────────────────────────────────────────────────────────────────

class MupTaskModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "mup_tasks"

    assigned_to: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


# ── LMS Notifications ─────────────────────────────────────────────────────────

class LmsNotificationModel(Base, UUIDPrimaryKey):
    __tablename__ = "lms_notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    linked_lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Compensation Models ───────────────────────────────────────────────────────

class CompensationModelModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "compensation_models"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    params: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)  # type: ignore[type-arg]
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


# ── Salary Calculations ───────────────────────────────────────────────────────

class SalaryCalculationModel(Base, UUIDPrimaryKey):
    __tablename__ = "salary_calculations"

    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    period_month: Mapped[int] = mapped_column(Integer, nullable=False)
    period_year: Mapped[int] = mapped_column(Integer, nullable=False)
    lessons_conducted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    base_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    bonus_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="UZS")
    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    calculated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Payments ──────────────────────────────────────────────────────────────────

class PaymentModel(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "payments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="UZS")
    status: Mapped[str] = mapped_column(
        SAEnum("paid", "pending", "overdue", name="payment_status", create_type=False),
        nullable=False, default="pending", index=True,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    receipt_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


# ── Exams ─────────────────────────────────────────────────────────────────────

class ExamModel(Base, UUIDPrimaryKey):
    __tablename__ = "exams"

    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    max_score: Mapped[Decimal] = mapped_column(Numeric(4, 1), nullable=False, default=12)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


# ── Risk Factors ──────────────────────────────────────────────────────────────

class RiskFactorModel(Base, UUIDPrimaryKey):
    __tablename__ = "risk_factors"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    factor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # type: ignore[type-arg]
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
