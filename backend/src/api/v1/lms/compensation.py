"""LMS Compensation — salary calculations per teacher."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from sqlalchemy import select, func

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.lms import SalaryCalculationModel, LessonModel, CompensationModelModel
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/lms", tags=["LMS - Compensation"])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class SalaryOut(CamelModel):
    id: UUID
    teacher_id: UUID
    teacher_name: str | None = None
    period_month: int
    period_year: int
    lessons_conducted: int
    base_amount: float
    bonus_amount: float
    total_amount: float
    currency: str = "UZS"
    is_paid: bool = False
    calculated_at: str | None = None


def _sal_out(s: SalaryCalculationModel, name: str | None = None) -> SalaryOut:
    return SalaryOut(
        id=s.id, teacher_id=s.teacher_id, teacher_name=name,
        period_month=s.period_month, period_year=s.period_year,
        lessons_conducted=s.lessons_conducted,
        base_amount=float(s.base_amount), bonus_amount=float(s.bonus_amount),
        total_amount=float(s.total_amount), currency=s.currency,
        is_paid=s.is_paid,
        calculated_at=s.calculated_at.isoformat() if s.calculated_at else None,
    )


# ── List ─────────────────────────────────────────────────────────────────────

@router.get("/compensation")
async def list_compensation(current_user: CurrentUser, db: DbSession) -> list[dict]:
    rows = (await db.execute(select(CompensationModelModel))).scalars().all()
    return [{
        "id": str(m.id), "teacherId": str(m.teacher_id),
        "modelType": m.type,
        "fixedMonthlyRate": float(m.rate) if m.type == "fixed_monthly" else None,
        "ratePerLesson": {"default": float(m.rate)} if m.type == "per_lesson" else None,
        "ratePerStudent": {"default": float(m.rate)} if m.type == "per_student" else None,
    } for m in rows]


@router.get("/compensation/{teacher_id}")
async def get_compensation_by_teacher(teacher_id: UUID, current_user: CurrentUser, db: DbSession) -> dict:
    m = (await db.execute(
        select(CompensationModelModel).where(CompensationModelModel.teacher_id == teacher_id)
    )).scalar_one_or_none()
    if not m:
        return {}
    return {
        "id": str(m.id), "teacherId": str(m.teacher_id),
        "modelType": m.type,
        "fixedMonthlyRate": float(m.rate) if m.type == "fixed_monthly" else None,
        "ratePerLesson": {"default": float(m.rate)} if m.type == "per_lesson" else None,
        "ratePerStudent": {"default": float(m.rate)} if m.type == "per_student" else None,
    }


# ── Compensation model (per-teacher rate config) ─────────────────────────────

class CompModelOut(CamelModel):
    id: UUID
    teacher_id: UUID
    model_type: str  # per_lesson, fixed_monthly, per_student
    rate: float
    currency: str = "UZS"
    effective_from: str


class SetCompModelIn(CamelModel):
    model_type: str
    rate: float | None = None
    fixed_monthly_rate: float | None = None
    rate_per_lesson: dict | None = None
    rate_per_student: dict | None = None
    effective_from: str | None = None


@router.put("/compensation/{teacher_id}", response_model=CompModelOut)
async def set_compensation_model(
    teacher_id: UUID, body: SetCompModelIn, current_user: CurrentUser, db: DbSession,
) -> CompModelOut:
    from datetime import date as d_type

    # Resolve rate from various input formats
    rate = body.rate or body.fixed_monthly_rate or 0
    if not rate and body.rate_per_lesson:
        rate = body.rate_per_lesson.get("default", 0)
    if not rate and body.rate_per_student:
        rate = body.rate_per_student.get("default", 0)

    eff_from = d_type.fromisoformat(body.effective_from) if body.effective_from else d_type.today()

    # Upsert
    existing = (await db.execute(
        select(CompensationModelModel).where(CompensationModelModel.teacher_id == teacher_id)
    )).scalar_one_or_none()

    if existing:
        existing.type = body.model_type
        existing.rate = rate
        existing.effective_from = eff_from
        m = existing
    else:
        m = CompensationModelModel(
            id=uuid4(), teacher_id=teacher_id,
            type=body.model_type, rate=rate, currency="UZS",
            effective_from=eff_from,
        )
        db.add(m)

    await db.commit()
    await db.refresh(m)
    return CompModelOut(
        id=m.id, teacher_id=m.teacher_id,
        model_type=m.type, rate=float(m.rate),
        currency=m.currency, effective_from=str(m.effective_from),
    )


# ── Salaries (alias) ─────────────────────────────────────────────────────────

@router.get("/salaries", response_model=list[SalaryOut])
async def list_salaries(
    current_user: CurrentUser, db: DbSession,
    teacherId: UUID | None = Query(None, alias="teacherId"),
) -> list[SalaryOut]:
    q = select(SalaryCalculationModel)
    if teacherId:
        q = q.where(SalaryCalculationModel.teacher_id == teacherId)
    rows = (await db.execute(
        q.order_by(SalaryCalculationModel.period_year.desc(), SalaryCalculationModel.period_month.desc())
    )).scalars().all()
    tids = {s.teacher_id for s in rows}
    name_map: dict = {}
    if tids:
        users = (await db.execute(select(UserModel).where(UserModel.id.in_(tids)))).scalars().all()
        name_map = {u.id: u.name for u in users}
    return [_sal_out(s, name_map.get(s.teacher_id)) for s in rows]


# ── Calculate ────────────────────────────────────────────────────────────────

class CalculateRequest(CamelModel):
    teacher_id: UUID
    period: str  # "2026-04"


@router.post("/salaries/calculate", response_model=SalaryOut, status_code=status.HTTP_201_CREATED)
async def calculate_salary(body: CalculateRequest, current_user: CurrentUser, db: DbSession) -> SalaryOut:
    parts = body.period.split("-")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Period format: YYYY-MM")
    year, month = int(parts[0]), int(parts[1])

    # Check if already calculated
    existing = (await db.execute(
        select(SalaryCalculationModel).where(
            SalaryCalculationModel.teacher_id == body.teacher_id,
            SalaryCalculationModel.period_year == year,
            SalaryCalculationModel.period_month == month,
        )
    )).scalar_one_or_none()
    if existing:
        # Recalculate
        from sqlalchemy import extract
        lessons_count = (await db.execute(
            select(func.count()).where(
                LessonModel.teacher_id == body.teacher_id,
                LessonModel.status == "completed",
                extract("year", LessonModel.scheduled_at) == year,
                extract("month", LessonModel.scheduled_at) == month,
            )
        )).scalar() or 0

        base_rate = 50000.0
        existing.lessons_conducted = lessons_count
        existing.base_amount = base_rate * lessons_count
        existing.total_amount = existing.base_amount + float(existing.bonus_amount)
        existing.calculated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(existing)
        user = (await db.execute(select(UserModel.name).where(UserModel.id == body.teacher_id))).scalar()
        return _sal_out(existing, user)

    # New calculation
    from sqlalchemy import extract
    lessons_count = (await db.execute(
        select(func.count()).where(
            LessonModel.teacher_id == body.teacher_id,
            LessonModel.status == "completed",
            extract("year", LessonModel.scheduled_at) == year,
            extract("month", LessonModel.scheduled_at) == month,
        )
    )).scalar() or 0

    base_rate = 50000.0
    base_amount = base_rate * lessons_count

    s = SalaryCalculationModel(
        id=uuid4(),
        teacher_id=body.teacher_id,
        period_month=month,
        period_year=year,
        lessons_conducted=lessons_count,
        base_amount=base_amount,
        bonus_amount=0,
        total_amount=base_amount,
        currency="UZS",
        is_paid=False,
        calculated_at=datetime.now(timezone.utc),
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    user = (await db.execute(select(UserModel.name).where(UserModel.id == body.teacher_id))).scalar()
    return _sal_out(s, user)
