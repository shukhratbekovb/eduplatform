"""LMS Compensation — salary calculations per teacher."""
from __future__ import annotations

from datetime import datetime, timezone, date
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select

from src.api.dependencies import CurrentUser, DbSession
from src.infrastructure.persistence.models.lms import SalaryCalculationModel
from src.infrastructure.persistence.models.auth import UserModel

router = APIRouter(prefix="/lms", tags=["LMS - Compensation"])


class SalaryOut(BaseModel):
    id: UUID
    teacherId: UUID
    teacherName: str | None
    periodStart: str
    periodEnd: str
    lessonsCount: int
    studentsCount: int
    baseAmount: float
    bonusAmount: float
    totalAmount: float
    calculatedAt: str


def _sal_out(s: SalaryCalculationModel, teacher_name: str | None = None) -> SalaryOut:
    return SalaryOut(
        id=s.id,
        teacherId=s.teacher_id,
        teacherName=teacher_name,
        periodStart=s.period_start.isoformat() if s.period_start else "",
        periodEnd=s.period_end.isoformat() if s.period_end else "",
        lessonsCount=s.lessons_count,
        studentsCount=s.students_count,
        baseAmount=float(s.base_amount),
        bonusAmount=float(s.bonus_amount),
        totalAmount=float(s.total_amount),
        calculatedAt=s.calculated_at.isoformat() if s.calculated_at else "",
    )


@router.get("/compensation", response_model=list[SalaryOut])
async def list_compensation(current_user: CurrentUser, db: DbSession) -> list[SalaryOut]:
    rows = (await db.execute(
        select(SalaryCalculationModel).order_by(SalaryCalculationModel.period_start.desc())
    )).scalars().all()
    result = []
    for s in rows:
        user = (await db.execute(select(UserModel.name).where(UserModel.id == s.teacher_id))).scalar()
        result.append(_sal_out(s, user))
    return result


@router.get("/compensation/{teacher_id}", response_model=list[SalaryOut])
async def get_compensation_by_teacher(teacher_id: UUID, current_user: CurrentUser, db: DbSession) -> list[SalaryOut]:
    rows = (await db.execute(
        select(SalaryCalculationModel)
        .where(SalaryCalculationModel.teacher_id == teacher_id)
        .order_by(SalaryCalculationModel.period_start.desc())
    )).scalars().all()
    user = (await db.execute(select(UserModel.name).where(UserModel.id == teacher_id))).scalar()
    return [_sal_out(s, user) for s in rows]


class CalculateSalaryRequest(BaseModel):
    teacherId: UUID | None = None
    teacher_id: UUID | None = None
    period: str | None = None    # e.g. "2026-04"
    periodStart: str | None = None
    periodEnd: str | None = None

    def resolved_teacher_id(self) -> UUID:
        v = self.teacherId or self.teacher_id
        if v is None:
            raise ValueError("teacherId is required")
        return v


@router.get("/salaries", response_model=list[SalaryOut])
async def list_salaries(
    current_user: CurrentUser,
    db: DbSession,
    teacherId: UUID | None = None,
    teacher_id: UUID | None = None,
) -> list[SalaryOut]:
    q = select(SalaryCalculationModel)
    target = teacherId or teacher_id
    if target:
        q = q.where(SalaryCalculationModel.teacher_id == target)
    rows = (await db.execute(q.order_by(SalaryCalculationModel.period_start.desc()))).scalars().all()
    result = []
    for s in rows:
        user = (await db.execute(select(UserModel.name).where(UserModel.id == s.teacher_id))).scalar()
        result.append(_sal_out(s, user))
    return result


@router.post("/salaries/calculate", response_model=SalaryOut, status_code=status.HTTP_201_CREATED)
async def calculate_salary(body: CalculateSalaryRequest, current_user: CurrentUser, db: DbSession) -> SalaryOut:
    try:
        teacher_id = body.resolved_teacher_id()
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    now = datetime.now(timezone.utc)
    period_start = date.fromisoformat(body.periodStart or f"{body.period or now.strftime('%Y-%m')}-01")
    period_end_str = body.periodEnd
    if not period_end_str:
        import calendar
        _, last_day = calendar.monthrange(period_start.year, period_start.month)
        period_end = date(period_start.year, period_start.month, last_day)
    else:
        period_end = date.fromisoformat(period_end_str)

    # Count lessons taught in this period
    from src.infrastructure.persistence.models.lms import LessonModel, EnrollmentModel
    from sqlalchemy import func
    lessons_count = (await db.execute(
        select(func.count()).where(
            LessonModel.teacher_id == teacher_id,
            LessonModel.status == "completed",
            LessonModel.lesson_date >= period_start,
            LessonModel.lesson_date <= period_end,
        )
    )).scalar() or 0

    base_rate = 50000.0  # UZS per lesson (default)
    base_amount = base_rate * lessons_count
    bonus_amount = 0.0
    total_amount = base_amount + bonus_amount

    s = SalaryCalculationModel(
        id=uuid4(),
        teacher_id=teacher_id,
        period_start=period_start,
        period_end=period_end,
        lessons_count=lessons_count,
        students_count=0,
        base_amount=base_amount,
        bonus_amount=bonus_amount,
        total_amount=total_amount,
        calculated_at=now,
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    user = (await db.execute(select(UserModel.name).where(UserModel.id == teacher_id))).scalar()
    return _sal_out(s, user)
