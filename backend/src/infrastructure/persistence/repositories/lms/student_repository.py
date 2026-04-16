from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.application.interfaces.repositories import Page, StudentRepository
from src.domain.lms.entities import BadgeLevel, RiskLevel, Student
from src.infrastructure.persistence.models.lms import StudentModel


def _to_domain(m: StudentModel) -> Student:
    return Student(
        id=m.id,
        user_id=m.user_id,
        student_code=m.student_code,
        full_name="",  # populated from joined UserModel when needed
        phone=m.phone,
        parent_phone=m.parent_phone,
        date_of_birth=m.date_of_birth,
        risk_level=RiskLevel(m.risk_level),
        stars=m.stars,
        crystals=m.crystals,
        total_coins=m.coins,
        badge_level=BadgeLevel(m.badge_level) if m.badge_level else BadgeLevel.BRONZE,
        gpa=Decimal(str(m.gpa)) if m.gpa is not None else None,
        attendance_percent=Decimal(str(m.attendance_percent)) if m.attendance_percent is not None else None,
    )


def _apply_fields(m: StudentModel, s: Student) -> None:
    m.user_id = s.user_id
    m.student_code = s.student_code
    m.phone = s.phone
    m.parent_phone = s.parent_phone
    m.date_of_birth = s.date_of_birth
    m.risk_level = s.risk_level.value
    m.stars = s.stars
    m.crystals = s.crystals
    m.coins = s.total_coins
    m.badge_level = s.badge_level.value
    m.gpa = s.gpa
    m.attendance_percent = s.attendance_percent


class SqlStudentRepository(StudentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get_by_id(self, student_id: UUID) -> Student | None:
        m = await self._s.get(StudentModel, student_id)
        return _to_domain(m) if m else None

    async def get_by_user_id(self, user_id: UUID) -> Student | None:
        result = await self._s.execute(
            select(StudentModel).where(StudentModel.user_id == user_id)
        )
        m = result.scalar_one_or_none()
        return _to_domain(m) if m else None

    async def save(self, student: Student) -> None:
        existing = await self._s.get(StudentModel, student.id)
        if existing is None:
            m = StudentModel(id=student.id)
            _apply_fields(m, student)
            self._s.add(m)
        else:
            _apply_fields(existing, student)

    async def list(
        self,
        *,
        direction_id: UUID | None = None,
        risk_level: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Student]:
        q = select(StudentModel)
        if direction_id is not None:
            q = q.where(StudentModel.direction_id == direction_id)
        if risk_level is not None:
            q = q.where(StudentModel.risk_level == risk_level)

        total_q = select(func.count()).select_from(q.subquery())
        total = (await self._s.execute(total_q)).scalar_one()

        q = q.offset((page - 1) * page_size).limit(page_size)
        rows = (await self._s.execute(q)).scalars().all()
        return Page(items=[_to_domain(r) for r in rows], total=total, page=page, page_size=page_size)

    async def get_by_group(self, group_id: UUID) -> list[Student]:
        from src.infrastructure.persistence.models.lms import EnrollmentModel
        result = await self._s.execute(
            select(StudentModel)
            .join(EnrollmentModel, EnrollmentModel.student_id == StudentModel.id)
            .where(EnrollmentModel.group_id == group_id, EnrollmentModel.is_active == True)  # noqa: E712
        )
        return [_to_domain(r) for r in result.scalars().all()]
