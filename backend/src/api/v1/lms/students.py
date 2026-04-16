from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from sqlalchemy import select
from src.api.dependencies import CurrentUser, DbSession, require_roles
from src.application.lms.students.use_cases import (
    CreateStudentInput,
    CreateStudentUseCase,
    GetStudentUseCase,
    ListStudentsUseCase,
    RecalculateRiskUseCase,
    UpdateStudentInput,
    UpdateStudentUseCase,
)
from src.domain.lms.entities import Student
from src.infrastructure.persistence.models.lms import StudentModel
from src.infrastructure.persistence.repositories.lms.student_repository import SqlStudentRepository
from src.infrastructure.persistence.repositories.user_repository import SqlUserRepository

router = APIRouter(prefix="/students", tags=["LMS - Students"])

StaffGuard = Annotated[object, Depends(require_roles("director", "mup", "teacher"))]


class StudentResponse(BaseModel):
    id: UUID
    userId: UUID | None = None
    studentCode: str | None = None
    fullName: str = ""
    phone: str | None = None
    email: str | None = None
    photoUrl: str | None = None
    parentPhone: str | None = None
    riskLevel: str = "low"
    stars: int = 0
    crystals: int = 0
    totalCoins: int = 0
    badgeLevel: str = "bronze"
    gpa: float | None = None
    attendancePercent: float | None = None

    @classmethod
    def from_model(cls, m) -> "StudentResponse":  # type: ignore[no-untyped-def]
        return cls(
            id=m.id,
            userId=m.user_id,
            studentCode=m.student_code,
            fullName=m.full_name or "",
            phone=m.phone,
            email=getattr(m, "email", None),
            photoUrl=getattr(m, "photo_url", None),
            parentPhone=m.parent_phone,
            riskLevel=m.risk_level or "low",
            stars=m.stars or 0,
            crystals=m.crystals or 0,
            totalCoins=m.coins or 0,
            badgeLevel=m.badge_level or "bronze",
            gpa=float(m.gpa) if m.gpa is not None else None,
            attendancePercent=float(m.attendance_percent) if m.attendance_percent is not None else None,
        )


class PagedStudents(BaseModel):
    data: list[StudentResponse]
    total: int
    page: int
    limit: int
    totalPages: int


class CreateStudentRequest(BaseModel):
    user_id: UUID
    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


class UpdateStudentRequest(BaseModel):
    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    body: CreateStudentRequest,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    uc = CreateStudentUseCase(
        students=SqlStudentRepository(db),
        users=SqlUserRepository(db),
    )
    try:
        student = await uc.execute(CreateStudentInput(
            user_id=body.user_id,
            phone=body.phone,
            parent_phone=body.parent_phone,
            student_code=body.student_code,
        ))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await db.commit()
    return StudentResponse.from_domain(student)


@router.get("", response_model=PagedStudents)
async def list_students(
    _: StaffGuard,
    db: DbSession,
    direction_id: UUID | None = None,
    risk_level: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PagedStudents:
    from sqlalchemy import func as fn

    q = select(StudentModel)
    if direction_id:
        q = q.where(StudentModel.direction_id == direction_id)
    if risk_level:
        q = q.where(StudentModel.risk_level == risk_level)
    if search:
        q = q.where(
            StudentModel.full_name.ilike(f"%{search}%")
            | StudentModel.phone.ilike(f"%{search}%")
            | StudentModel.student_code.ilike(f"%{search}%")
        )

    total = (await db.execute(select(fn.count()).select_from(q.subquery()))).scalar() or 0
    rows = (await db.execute(
        q.order_by(StudentModel.full_name)
        .offset((page - 1) * page_size).limit(page_size)
    )).scalars().all()

    return PagedStudents(
        data=[StudentResponse.from_model(m) for m in rows],
        total=total,
        page=page,
        limit=page_size,
        totalPages=max(1, -(-total // page_size)),
    )


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentResponse.from_model(m)


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    body: UpdateStudentRequest,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    uc = UpdateStudentUseCase(SqlStudentRepository(db))
    try:
        student = await uc.execute(student_id, UpdateStudentInput(
            phone=body.phone,
            parent_phone=body.parent_phone,
            student_code=body.student_code,
        ))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    await db.commit()
    return StudentResponse.from_domain(student)


@router.post("/{student_id}/recalculate-risk", response_model=StudentResponse)
async def recalculate_risk(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    uc = RecalculateRiskUseCase(SqlStudentRepository(db))
    try:
        student = await uc.execute(student_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    await db.commit()
    return StudentResponse.from_domain(student)
