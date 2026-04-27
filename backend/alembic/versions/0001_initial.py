"""initial

Revision ID: 0001
Revises:
Create Date: 2026-04-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- CORE ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("director","mup","teacher","sales_manager","cashier","student", name="user_role", create_type=False), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("avatar_url", sa.String, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])

    # --- LMS ---
    op.create_table(
        "directions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("duration_months", sa.Integer, nullable=True),
        sa.Column("total_lessons", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "subjects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("direction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("directions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_subjects_direction_id", "subjects", ["direction_id"])
    op.create_index("ix_subjects_teacher_id", "subjects", ["teacher_id"])

    op.create_table(
        "rooms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("capacity", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "students",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("photo_url", sa.Text, nullable=True),
        sa.Column("student_code", sa.String(20), nullable=True, unique=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("parent_name", sa.String(255), nullable=True),
        sa.Column("parent_phone", sa.String(30), nullable=True),
        sa.Column("date_of_birth", sa.Date, nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("direction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("directions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("gpa", sa.Numeric(4, 2), nullable=True),
        sa.Column("attendance_percent", sa.Numeric(5, 2), nullable=True),
        sa.Column("risk_level", sa.Enum("low","medium","high","critical", name="risk_level", create_type=False), nullable=False, server_default="low"),
        sa.Column("stars", sa.Integer, nullable=False, server_default="0"),
        sa.Column("crystals", sa.Integer, nullable=False, server_default="0"),
        sa.Column("coins", sa.Integer, nullable=False, server_default="0"),
        sa.Column("badge_level", sa.Enum("bronze","silver","gold","platinum","diamond", name="badge_level", create_type=False), nullable=False, server_default="bronze"),
        sa.Column("risk_last_updated", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_students_user_id", "students", ["user_id"])
    op.create_index("ix_students_direction_id", "students", ["direction_id"])
    op.create_index("ix_students_risk_level", "students", ["risk_level"])

    op.create_table(
        "groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("direction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("directions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("schedule", postgresql.JSONB, nullable=True),
        sa.Column("max_students", sa.Integer, nullable=True),
        sa.Column("price_per_month", sa.Numeric(10, 2), nullable=True),
        sa.Column("started_at", sa.Date, nullable=True),
        sa.Column("ended_at", sa.Date, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_groups_direction_id", "groups", ["direction_id"])

    op.create_table(
        "enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dropped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )
    op.create_index("ix_enrollments_student_id", "enrollments", ["student_id"])
    op.create_index("ix_enrollments_group_id", "enrollments", ["group_id"])

    op.create_table(
        "lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("room_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False, server_default="90"),
        sa.Column("topic", sa.String(255), nullable=True),
        sa.Column("status", sa.Enum("scheduled","completed","cancelled", name="lesson_status", create_type=False), nullable=False, server_default="scheduled"),
        sa.Column("cancel_reason", sa.Text, nullable=True),
        sa.Column("is_online", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("online_link", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_lessons_group_id", "lessons", ["group_id"])
    op.create_index("ix_lessons_subject_id", "lessons", ["subject_id"])
    op.create_index("ix_lessons_teacher_id", "lessons", ["teacher_id"])
    op.create_index("ix_lessons_scheduled_at", "lessons", ["scheduled_at"])
    op.create_index("ix_lessons_status", "lessons", ["status"])

    op.create_table(
        "attendance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("present","absent","late","excused", name="attendance_status", create_type=False), nullable=False),
        sa.Column("minutes_late", sa.Integer, nullable=True),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("recorded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_attendance_records_lesson_id", "attendance_records", ["lesson_id"])
    op.create_index("ix_attendance_records_student_id", "attendance_records", ["student_id"])

    op.create_table(
        "grade_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True),
        sa.Column("exam_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("type", sa.Enum("homework","exam","quiz","project","participation", name="grade_type", create_type=False), nullable=False),
        sa.Column("score", sa.Numeric(5, 2), nullable=False),
        sa.Column("max_score", sa.Numeric(5, 2), nullable=False, server_default="100"),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("graded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_grade_records_student_id", "grade_records", ["student_id"])
    op.create_index("ix_grade_records_subject_id", "grade_records", ["subject_id"])

    op.create_table(
        "diamond_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("awarded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("awarded_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_diamond_records_student_id", "diamond_records", ["student_id"])

    op.create_table(
        "lesson_materials",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("type", sa.Enum("video","pdf","audio","link","image","other", name="material_type", create_type=False), nullable=False),
        sa.Column("url", sa.Text, nullable=False),
        sa.Column("s3_key", sa.Text, nullable=True),
        sa.Column("size_bytes", sa.BigInteger, nullable=True),
        sa.Column("language", sa.String(10), nullable=True),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_lesson_materials_lesson_id", "lesson_materials", ["lesson_id"])

    op.create_table(
        "homework_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_score", sa.Numeric(5, 2), nullable=False, server_default="100"),
        sa.Column("file_urls", postgresql.JSONB, nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_homework_assignments_lesson_id", "homework_assignments", ["lesson_id"])

    op.create_table(
        "homework_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("assignment_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("homework_assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.Enum("pending","submitted","graded","overdue", name="homework_status", create_type=False), nullable=False, server_default="pending"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("answer_text", sa.Text, nullable=True),
        sa.Column("file_url", sa.Text, nullable=True),
        sa.Column("s3_key", sa.Text, nullable=True),
        sa.Column("score", sa.Numeric(5, 2), nullable=True),
        sa.Column("feedback", sa.Text, nullable=True),
        sa.Column("graded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_homework_submissions_assignment_id", "homework_submissions", ["assignment_id"])
    op.create_index("ix_homework_submissions_student_id", "homework_submissions", ["student_id"])
    op.create_index("ix_homework_submissions_status", "homework_submissions", ["status"])

    op.create_table(
        "late_entry_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column("is_approved", sa.Boolean, nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_late_entry_requests_student_id", "late_entry_requests", ["student_id"])

    op.create_table(
        "coin_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Integer, nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("issued_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_coin_transactions_student_id", "coin_transactions", ["student_id"])

    op.create_table(
        "mup_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_done", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("priority", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_mup_tasks_assigned_to", "mup_tasks", ["assigned_to"])
    op.create_index("ix_mup_tasks_status", "mup_tasks", ["status"])
    op.create_index("ix_mup_tasks_student_id", "mup_tasks", ["student_id"])

    op.create_table(
        "lms_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("linked_lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_lms_notifications_user_id", "lms_notifications", ["user_id"])
    op.create_index("ix_lms_notifications_is_read", "lms_notifications", ["is_read"])

    op.create_table(
        "compensation_models",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("rate", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="UZS"),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("effective_until", sa.Date, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_compensation_models_teacher_id", "compensation_models", ["teacher_id"])

    op.create_table(
        "salary_calculations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period_month", sa.Integer, nullable=False),
        sa.Column("period_year", sa.Integer, nullable=False),
        sa.Column("lessons_conducted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("base_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("bonus_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="UZS"),
        sa.Column("is_paid", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_salary_calculations_teacher_id", "salary_calculations", ["teacher_id"])

    op.create_table(
        "exams",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("groups.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column("max_score", sa.Numeric(5, 2), nullable=False, server_default="100"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "risk_factors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("factor_type", sa.String(50), nullable=False),
        sa.Column("value", sa.Numeric(5, 2), nullable=False),
        sa.Column("details", postgresql.JSONB, nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_risk_factors_student_id", "risk_factors", ["student_id"])

    # --- GAMIFICATION ---
    op.create_table(
        "achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("category", sa.Enum("academic","attendance","activity","social","special", name="ach_category", create_type=False), nullable=False),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("reward_stars", sa.Integer, nullable=False, server_default="0"),
        sa.Column("reward_crystals", sa.Integer, nullable=False, server_default="0"),
        sa.Column("trigger_type", sa.String(50), nullable=True),
        sa.Column("trigger_value", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "student_achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("achievement_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_achievements_student_id", "student_achievements", ["student_id"])

    op.create_table(
        "student_activity_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum("stars_earned","crystals_earned","homework_graded","attendance","teacher_reply","badge_unlocked", name="activity_event_type", create_type=False), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("stars_amount", sa.Integer, nullable=True),
        sa.Column("crystals_amount", sa.Integer, nullable=True),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("linked_lesson_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_activity_events_student_id", "student_activity_events", ["student_id"])
    op.create_index("ix_student_activity_events_created_at", "student_activity_events", ["created_at"])

    op.create_table(
        "shop_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("icon", sa.String(10), nullable=True),
        sa.Column("category", sa.String(50), nullable=False, server_default="reward"),
        sa.Column("cost_stars", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cost_crystals", sa.Integer, nullable=False, server_default="0"),
        sa.Column("stock", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "student_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("shop_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_purchases_student_id", "student_purchases", ["student_id"])

    # --- CRM ---
    op.create_table(
        "funnels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_archived", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "stages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("funnel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("funnels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(20), nullable=False, server_default="'#6366F1'"),
        sa.Column("win_probability", sa.Integer, nullable=False, server_default="0"),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index("ix_stages_funnel_id", "stages", ["funnel_id"])

    op.create_table(
        "crm_contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "lead_sources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.Enum("manual","import","api","landing", name="lead_source_type", create_type=False), nullable=False, server_default="manual"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("funnel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("funnels.id", ondelete="SET NULL"), nullable=True),
        sa.Column("api_key", sa.String(64), unique=True, nullable=True),
        sa.Column("webhook_url", sa.Text, nullable=True),
        sa.Column("webhook_secret", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lead_sources.id", ondelete="SET NULL"), nullable=True),
        sa.Column("funnel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("funnels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("crm_contacts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.Enum("active","won","lost", name="lead_status", create_type=False), nullable=False, server_default="active"),
        sa.Column("lost_reason", sa.Text, nullable=True),
        sa.Column("custom_fields", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_leads_funnel_id", "leads", ["funnel_id"])
    op.create_index("ix_leads_stage_id", "leads", ["stage_id"])
    op.create_index("ix_leads_assigned_to", "leads", ["assigned_to"])
    op.create_index("ix_leads_status", "leads", ["status"])
    op.create_index("ix_leads_source_id", "leads", ["source_id"])
    op.create_index("ix_leads_contact_id", "leads", ["contact_id"])
    op.create_index("ix_leads_created_at", "leads", ["created_at"])

    op.create_table(
        "custom_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("funnel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("funnels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("type", sa.Enum("text","number","date","select","multiselect","checkbox", name="cf_type", create_type=False), nullable=False),
        sa.Column("options", postgresql.JSONB, nullable=True),
        sa.Column("order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_custom_fields_funnel_id", "custom_fields", ["funnel_id"])

    op.create_table(
        "lead_activities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum("call","meeting","message","other", name="activity_type", create_type=False), nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outcome", sa.Text, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column("channel", sa.String(50), nullable=True),
        sa.Column("needs_follow_up", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_lead_activities_lead_id", "lead_activities", ["lead_id"])
    op.create_index("ix_lead_activities_date", "lead_activities", ["date"])

    op.create_table(
        "lead_stage_changes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_stage_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("to_stage_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stages.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_lead_stage_changes_lead_id", "lead_stage_changes", ["lead_id"])

    op.create_table(
        "lead_assignment_changes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("to_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_lead_assignment_changes_lead_id", "lead_assignment_changes", ["lead_id"])

    op.create_table(
        "lead_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_lead_comments_lead_id", "lead_comments", ["lead_id"])

    op.create_table(
        "crm_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("linked_lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("priority", sa.Enum("low","medium","high","critical", name="task_priority", create_type=False), nullable=False, server_default="medium"),
        sa.Column("status", sa.Enum("pending","in_progress","done","overdue", name="task_status_crm", create_type=False), nullable=False, server_default="pending"),
        sa.Column("reminder_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_auto_created", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_crm_tasks_linked_lead_id", "crm_tasks", ["linked_lead_id"])
    op.create_index("ix_crm_tasks_assigned_to", "crm_tasks", ["assigned_to"])
    op.create_index("ix_crm_tasks_due_date", "crm_tasks", ["due_date"])
    op.create_index("ix_crm_tasks_status", "crm_tasks", ["status"])

    op.create_table(
        "crm_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.Enum("task_due_soon","task_overdue","task_assigned", name="notif_type_crm", create_type=False), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text, nullable=True),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("linked_task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("crm_tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_crm_notifications_user_id", "crm_notifications", ["user_id"])
    op.create_index("ix_crm_notifications_is_read", "crm_notifications", ["is_read"])

    # --- CONTRACTS ---
    op.execute("CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1")

    op.create_table(
        "contracts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("contract_number", sa.String(20), unique=True, nullable=True),
        sa.Column("lead_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("leads.id", ondelete="SET NULL"), nullable=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("direction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("directions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("payment_type", sa.String(20), nullable=False, server_default="monthly"),
        sa.Column("payment_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("currency", sa.String(10), nullable=False, server_default="UZS"),
        sa.Column("start_date", sa.Date, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_contracts_student_id", "contracts", ["student_id"])
    op.create_index("ix_contracts_direction_id", "contracts", ["direction_id"])
    op.create_index("ix_contracts_status", "contracts", ["status"])
    op.create_index("ix_contracts_created_at", "contracts", ["created_at"])

    op.create_table(
        "contract_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_contract_files_contract_id", "contract_files", ["contract_id"])

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("contract_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("group_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("groups.id", ondelete="SET NULL"), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False, server_default="UZS"),
        sa.Column("status", sa.Enum("pending","paid","overdue","cancelled", name="payment_status", create_type=False), nullable=False, server_default="pending"),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("method", sa.String(50), nullable=True),
        sa.Column("paid_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("period_number", sa.Integer, nullable=True),
        sa.Column("receipt_url", sa.Text, nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_payments_student_id", "payments", ["student_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_due_date", "payments", ["due_date"])

    op.create_table(
        "student_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_student_documents_student_id", "student_documents", ["student_id"])

    # --- MISSING COLUMNS ---
    # students: full_name, email, photo_url, parent_name, is_active
    # (These are already in the model but not in the initial migration)


def downgrade() -> None:
    # Drop tables in reverse FK order
    op.drop_table("student_documents")
    op.drop_table("contract_files")
    op.drop_table("contracts")
    op.execute("DROP SEQUENCE IF EXISTS contract_number_seq")
    op.drop_table("crm_notifications")
    op.drop_table("crm_tasks")
    op.drop_table("lead_comments")
    op.drop_table("lead_assignment_changes")
    op.drop_table("lead_stage_changes")
    op.drop_table("lead_activities")
    op.drop_table("custom_fields")
    op.drop_table("leads")
    op.drop_table("lead_sources")
    op.drop_table("crm_contacts")
    op.drop_table("stages")
    op.drop_table("funnels")
    op.drop_table("student_purchases")
    op.drop_table("shop_items")
    op.drop_table("student_activity_events")
    op.drop_table("student_achievements")
    op.drop_table("achievements")
    op.drop_table("risk_factors")
    op.drop_table("exams")
    op.drop_table("payments")
    op.drop_table("salary_calculations")
    op.drop_table("compensation_models")
    op.drop_table("lms_notifications")
    op.drop_table("mup_tasks")
    op.drop_table("coin_transactions")
    op.drop_table("late_entry_requests")
    op.drop_table("homework_submissions")
    op.drop_table("homework_assignments")
    op.drop_table("lesson_materials")
    op.drop_table("diamond_records")
    op.drop_table("grade_records")
    op.drop_table("attendance_records")
    op.drop_table("lessons")
    op.drop_table("enrollments")
    op.drop_table("groups")
    op.drop_table("students")
    op.drop_table("rooms")
    op.drop_table("subjects")
    op.drop_table("directions")
    op.drop_table("users")

    # Drop enums
    for enum in [
        "user_role", "risk_level", "badge_level", "lesson_status", "attendance_status",
        "grade_type", "homework_status", "payment_status", "ach_category",
        "activity_event_type", "lead_source_type", "lead_status", "cf_type",
        "activity_type", "task_priority", "task_status_crm", "notif_type_crm",
        "material_type",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum}")
