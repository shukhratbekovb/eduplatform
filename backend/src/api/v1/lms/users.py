"""LMS Users — staff CRUD with auto-generated passwords."""

from __future__ import annotations

import secrets
import string
from datetime import UTC, date, datetime
from typing import Annotated
from uuid import UUID, uuid4

import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import extract, func, select

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.auth import UserModel
from src.infrastructure.persistence.models.lms import DirectionModel, LessonModel, SubjectModel

router = APIRouter(prefix="/lms", tags=["LMS - Users"])

AdminGuard = Annotated[object, Depends(require_roles("director", "mup"))]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _generate_password(length: int = 10) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    pw = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$"),
    ]
    pw += [secrets.choice(chars) for _ in range(length - 4)]
    secrets.SystemRandom().shuffle(pw)
    return "".join(pw)


def _hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


async def _send_credentials_email(email: str, name: str, password: str) -> None:
    """Stub: send welcome email with credentials.
    TODO: integrate with real email service (SendGrid / SMTP / RabbitMQ task).
    """
    import logging

    log = logging.getLogger("lms.email")
    log.info("EMAIL STUB → to=%s name=%s password=%s", email, name, password)


# ── Schemas ──────────────────────────────────────────────────────────────────


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class StaffOut(CamelModel):
    id: UUID
    name: str
    email: str
    role: str
    phone: str | None = None
    date_of_birth: str | None = None
    avatar_url: str | None = None
    is_active: bool = True

    @classmethod
    def from_model(cls, u: UserModel) -> StaffOut:
        return cls(
            id=u.id,
            name=u.name,
            email=u.email,
            role=u.role,
            phone=u.phone,
            date_of_birth=str(u.date_of_birth) if u.date_of_birth else None,
            avatar_url=u.avatar_url,
            is_active=u.is_active,
        )


class SubjectBrief(CamelModel):
    id: UUID
    name: str
    direction_name: str | None = None


class StaffDetailOut(StaffOut):
    subjects: list[SubjectBrief] = []
    lessons_this_month: int = 0


class CreateStaffIn(CamelModel):
    name: str
    email: str
    role: str
    phone: str | None = None
    date_of_birth: date | None = None


class CreateStaffOut(StaffOut):
    generated_password: str


class UpdateStaffIn(CamelModel):
    name: str | None = None
    email: str | None = None
    role: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    is_active: bool | None = None


class AssignSubjectIn(CamelModel):
    subject_id: UUID


class BulkAssignSubjectsIn(CamelModel):
    subject_ids: list[UUID]


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/users", response_model=list[StaffOut])
async def list_lms_users(
    current_user: CurrentUser,
    db: DbSession,
    role: str | None = None,
) -> list[StaffOut]:
    q = select(UserModel).where(UserModel.is_active == True)  # noqa: E712
    if role:
        q = q.where(UserModel.role == role)
    else:
        q = q.where(UserModel.role != "student")
    rows = (await db.execute(q.order_by(UserModel.name))).scalars().all()
    return [StaffOut.from_model(u) for u in rows]


@router.get("/users/{user_id}", response_model=StaffDetailOut)
async def get_user_detail(user_id: UUID, current_user: CurrentUser, db: DbSession) -> StaffDetailOut:
    user = (await db.execute(select(UserModel).where(UserModel.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Subjects taught
    subj_rows = (
        (
            await db.execute(
                select(SubjectModel).where(SubjectModel.teacher_id == user_id, SubjectModel.is_active == True)  # noqa: E712
            )
        )
        .scalars()
        .all()
    )

    dir_ids = {s.direction_id for s in subj_rows if s.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    subjects = [SubjectBrief(id=s.id, name=s.name, direction_name=dir_map.get(s.direction_id)) for s in subj_rows]

    # Lessons this month
    now = datetime.now(UTC)
    lessons_this_month = (
        await db.execute(
            select(func.count(LessonModel.id)).where(
                LessonModel.teacher_id == user_id,
                LessonModel.status == "completed",
                extract("year", LessonModel.scheduled_at) == now.year,
                extract("month", LessonModel.scheduled_at) == now.month,
            )
        )
    ).scalar() or 0

    base = StaffOut.from_model(user)
    return StaffDetailOut(
        **base.model_dump(),
        subjects=subjects,
        lessons_this_month=lessons_this_month,
    )


@router.post("/users", response_model=CreateStaffOut, status_code=201)
async def create_user(body: CreateStaffIn, _: AdminGuard, current_user: CurrentUser, db: DbSession) -> CreateStaffOut:
    exists = (await db.execute(select(UserModel.id).where(UserModel.email == body.email))).scalar()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    allowed = {"teacher", "mup", "sales_manager", "cashier"}
    if current_user.role == "director":
        allowed.add("director")
    if body.role not in allowed:
        raise HTTPException(status_code=403, detail=f"Cannot create role: {body.role}")

    raw_password = _generate_password()
    user = UserModel(
        id=uuid4(),
        name=body.name,
        email=body.email,
        password_hash=_hash_pw(raw_password),
        role=body.role,
        phone=body.phone,
        date_of_birth=body.date_of_birth,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _send_credentials_email(user.email, user.name, raw_password)

    base = StaffOut.from_model(user)
    return CreateStaffOut(**base.model_dump(), generated_password=raw_password)


@router.patch("/users/{user_id}", response_model=StaffOut)
async def update_user(user_id: UUID, body: UpdateStaffIn, _: AdminGuard, db: DbSession) -> StaffOut:
    user = (await db.execute(select(UserModel).where(UserModel.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.email is not None:
        dup = (
            await db.execute(select(UserModel.id).where(UserModel.email == body.email, UserModel.id != user_id))
        ).scalar()
        if dup:
            raise HTTPException(status_code=409, detail="Email already taken")
        user.email = body.email
    if body.role is not None:
        user.role = body.role
    if body.phone is not None:
        user.phone = body.phone
    if body.date_of_birth is not None:
        user.date_of_birth = body.date_of_birth
    if body.is_active is not None:
        user.is_active = body.is_active
    await db.commit()
    await db.refresh(user)
    return StaffOut.from_model(user)


@router.post("/users/{user_id}/reset-password", response_model=CreateStaffOut)
async def reset_user_password(user_id: UUID, _: AdminGuard, db: DbSession) -> CreateStaffOut:
    user = (await db.execute(select(UserModel).where(UserModel.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    raw_password = _generate_password()
    user.password_hash = _hash_pw(raw_password)
    await db.commit()
    await db.refresh(user)
    await _send_credentials_email(user.email, user.name, raw_password)
    base = StaffOut.from_model(user)
    return CreateStaffOut(**base.model_dump(), generated_password=raw_password)


# ── Subject assignment ───────────────────────────────────────────────────────


@router.post("/users/{user_id}/subjects")
async def assign_subject(user_id: UUID, body: AssignSubjectIn, _: AdminGuard, db: DbSession) -> dict:
    subj = (await db.execute(select(SubjectModel).where(SubjectModel.id == body.subject_id))).scalar_one_or_none()
    if subj is None:
        raise HTTPException(status_code=404, detail="Subject not found")
    subj.teacher_id = user_id
    await db.commit()
    return {"ok": True}


@router.put("/users/{user_id}/subjects")
async def bulk_assign_subjects(user_id: UUID, body: BulkAssignSubjectsIn, _: AdminGuard, db: DbSession) -> dict:
    """Set subjects for a teacher — assigns given list, unassigns the rest."""
    rows = (await db.execute(select(SubjectModel).where(SubjectModel.id.in_(body.subject_ids)))).scalars().all()
    for s in rows:
        s.teacher_id = user_id
    await db.commit()
    return {"ok": True, "assigned": len(rows)}


@router.delete("/users/{user_id}/subjects/{subject_id}")
async def unassign_subject(user_id: UUID, subject_id: UUID, _: AdminGuard, db: DbSession) -> dict:
    subj = (
        await db.execute(select(SubjectModel).where(SubjectModel.id == subject_id, SubjectModel.teacher_id == user_id))
    ).scalar_one_or_none()
    if subj is None:
        raise HTTPException(status_code=404, detail="Subject not assigned to this user")
    subj.teacher_id = None
    await db.commit()
    return {"ok": True}


# ── Convenience ──────────────────────────────────────────────────────────────


@router.get("/users/{user_id}/directions")
async def get_teacher_directions(user_id: UUID, current_user: CurrentUser, db: DbSession) -> list[dict]:
    """Get unique directions for a teacher based on their subjects."""
    rows = (
        await db.execute(
            select(DirectionModel.id, DirectionModel.name)
            .join(SubjectModel, SubjectModel.direction_id == DirectionModel.id)
            .where(SubjectModel.teacher_id == user_id)
            .distinct()
        )
    ).all()
    return [{"id": str(r.id), "name": r.name} for r in rows]


@router.get("/teachers", response_model=list[StaffOut])
async def list_teachers(current_user: CurrentUser, db: DbSession) -> list[StaffOut]:
    rows = (
        (
            await db.execute(
                select(UserModel)
                .where(UserModel.role == "teacher", UserModel.is_active == True)  # noqa: E712
                .order_by(UserModel.name)
            )
        )
        .scalars()
        .all()
    )
    return [StaffOut.from_model(u) for u in rows]
