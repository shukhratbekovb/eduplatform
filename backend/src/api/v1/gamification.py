"""Gamification API — achievements, leaderboard, award stars/crystals."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, update, desc

from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.infrastructure.persistence.models.gamification import (
    AchievementModel,
    StudentAchievementModel,
    StudentActivityEventModel,
)
from src.infrastructure.persistence.models.lms import StudentModel
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/gamification", tags=["Gamification"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


# ── Achievements catalog ──────────────────────────────────────────────────────

class AchievementOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    icon: str | None
    reward_stars: int
    reward_crystals: int
    trigger_type: str | None
    trigger_value: int | None
    is_active: bool


class AchievementIn(BaseModel):
    name: str
    description: str | None = None
    category: str
    icon: str | None = None
    reward_stars: int = 0
    reward_crystals: int = 0
    trigger_type: str | None = None
    trigger_value: int | None = None


@router.get("/achievements", response_model=list[AchievementOut])
async def list_achievements(current_user: CurrentUser, db: DbSession) -> list[AchievementOut]:
    rows = (await db.execute(
        select(AchievementModel).where(AchievementModel.is_active == True)  # noqa: E712
    )).scalars().all()
    return [_ach_out(r) for r in rows]


@router.post("/achievements", response_model=AchievementOut, status_code=201)
async def create_achievement(
    body: AchievementIn, _: StaffGuard, db: DbSession
) -> AchievementOut:
    VALID_CATS = {"academic", "attendance", "activity", "social", "special"}
    if body.category not in VALID_CATS:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of {sorted(VALID_CATS)}")
    m = AchievementModel(id=uuid4(), **body.model_dump())
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return _ach_out(m)


# ── Award stars/crystals ──────────────────────────────────────────────────────

class AwardRequest(BaseModel):
    student_id: UUID
    stars: int = 0
    crystals: int = 0
    description: str
    subject_id: UUID | None = None
    lesson_id: UUID | None = None


@router.post("/award", response_model=dict)  # type: ignore[type-arg]
async def award_student(
    body: AwardRequest, _: StaffGuard, current_user: CurrentUser, db: DbSession
) -> dict:  # type: ignore[type-arg]
    if body.stars <= 0 and body.crystals <= 0:
        raise HTTPException(status_code=400, detail="Must award at least 1 star or crystal")

    student = await db.get(StudentModel, body.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    now = datetime.now(timezone.utc)

    if body.stars > 0:
        student.stars = (student.stars or 0) + body.stars
        db.add(StudentActivityEventModel(
            id=uuid4(), student_id=body.student_id,
            type="stars_earned", description=body.description,
            stars_amount=body.stars, crystals_amount=None,
            subject_id=body.subject_id, linked_lesson_id=body.lesson_id,
            created_at=now,
        ))

    if body.crystals > 0:
        student.crystals = (student.crystals or 0) + body.crystals
        db.add(StudentActivityEventModel(
            id=uuid4(), student_id=body.student_id,
            type="crystals_earned", description=body.description,
            stars_amount=None, crystals_amount=body.crystals,
            subject_id=body.subject_id, linked_lesson_id=body.lesson_id,
            created_at=now,
        ))

    await db.commit()
    return {"student_id": str(body.student_id), "stars": student.stars, "crystals": student.crystals}


# ── Unlock achievement ────────────────────────────────────────────────────────

class UnlockRequest(BaseModel):
    student_id: UUID
    achievement_id: UUID


@router.post("/unlock", response_model=dict)  # type: ignore[type-arg]
async def unlock_achievement(
    body: UnlockRequest, _: StaffGuard, db: DbSession
) -> dict:  # type: ignore[type-arg]
    ach = await db.get(AchievementModel, body.achievement_id)
    if ach is None:
        raise HTTPException(status_code=404, detail="Achievement not found")

    student = await db.get(StudentModel, body.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check already unlocked
    existing = (await db.execute(
        select(StudentAchievementModel).where(
            StudentAchievementModel.student_id == body.student_id,
            StudentAchievementModel.achievement_id == body.achievement_id,
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Achievement already unlocked")

    now = datetime.now(timezone.utc)
    db.add(StudentAchievementModel(
        id=uuid4(), student_id=body.student_id,
        achievement_id=body.achievement_id, unlocked_at=now,
    ))

    # Award bonus stars/crystals from achievement
    if ach.reward_stars > 0:
        student.stars = (student.stars or 0) + ach.reward_stars
    if ach.reward_crystals > 0:
        student.crystals = (student.crystals or 0) + ach.reward_crystals

    db.add(StudentActivityEventModel(
        id=uuid4(), student_id=body.student_id,
        type="badge_unlocked", description=f"Achievement unlocked: {ach.name}",
        stars_amount=ach.reward_stars or None, crystals_amount=ach.reward_crystals or None,
        created_at=now,
    ))

    await db.commit()
    return {"unlocked": True, "achievement": ach.name, "reward_stars": ach.reward_stars, "reward_crystals": ach.reward_crystals}


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardEntry(BaseModel):
    rank: int
    student_id: UUID
    full_name: str
    stars: int
    crystals: int
    badge_level: str


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def leaderboard(
    current_user: CurrentUser,
    db: DbSession,
    limit: int = Query(20, ge=1, le=100),
    metric: str = Query("stars", pattern="^(stars|crystals)$"),
) -> list[LeaderboardEntry]:
    order_col = StudentModel.stars if metric == "stars" else StudentModel.crystals
    rows = (await db.execute(
        select(StudentModel, UserModel)
        .join(UserModel, UserModel.id == StudentModel.user_id)
        .order_by(desc(order_col))
        .limit(limit)
    )).all()

    return [
        LeaderboardEntry(
            rank=i + 1,
            student_id=s.id,
            full_name=u.name,
            stars=s.stars or 0,
            crystals=s.crystals or 0,
            badge_level=s.badge_level or "bronze",
        )
        for i, (s, u) in enumerate(rows)
    ]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ach_out(m: AchievementModel) -> AchievementOut:
    return AchievementOut(
        id=m.id, name=m.name, description=m.description,
        category=m.category, icon=m.icon,
        reward_stars=m.reward_stars, reward_crystals=m.reward_crystals,
        trigger_type=m.trigger_type, trigger_value=m.trigger_value,
        is_active=m.is_active,
    )
