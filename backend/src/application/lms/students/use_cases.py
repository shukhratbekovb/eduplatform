"""LMS Student use cases."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4

from src.application.interfaces.repositories import Page, StudentRepository, UserRepository
from src.domain.lms.entities import BadgeLevel, RiskLevel, Student


@dataclass
class CreateStudentInput:
    user_id: UUID
    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


class CreateStudentUseCase:
    def __init__(self, students: StudentRepository, users: UserRepository) -> None:
        self._students = students
        self._users = users

    async def execute(self, inp: CreateStudentInput) -> Student:
        user = await self._users.get_by_id(inp.user_id)
        if user is None:
            raise ValueError(f"User {inp.user_id} not found")

        existing = await self._students.get_by_user_id(inp.user_id)
        if existing is not None:
            raise ValueError("Student profile already exists for this user")

        student = Student(
            id=uuid4(),
            user_id=inp.user_id,
            full_name=user.name,
            phone=inp.phone,
            parent_phone=inp.parent_phone,
            student_code=inp.student_code,
        )
        await self._students.save(student)
        return student


class GetStudentUseCase:
    def __init__(self, students: StudentRepository) -> None:
        self._students = students

    async def execute(self, student_id: UUID) -> Student:
        student = await self._students.get_by_id(student_id)
        if student is None:
            raise ValueError(f"Student {student_id} not found")
        return student


class ListStudentsUseCase:
    def __init__(self, students: StudentRepository) -> None:
        self._students = students

    async def execute(
        self,
        *,
        direction_id: UUID | None = None,
        risk_level: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Student]:
        return await self._students.list(
            direction_id=direction_id,
            risk_level=risk_level,
            search=search,
            page=page,
            page_size=page_size,
        )


@dataclass
class UpdateStudentInput:
    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


class UpdateStudentUseCase:
    def __init__(self, students: StudentRepository) -> None:
        self._students = students

    async def execute(self, student_id: UUID, inp: UpdateStudentInput) -> Student:
        student = await self._students.get_by_id(student_id)
        if student is None:
            raise ValueError(f"Student {student_id} not found")
        if inp.phone is not None:
            student.phone = inp.phone
        if inp.parent_phone is not None:
            student.parent_phone = inp.parent_phone
        if inp.student_code is not None:
            student.student_code = inp.student_code
        await self._students.save(student)
        return student


class RecalculateRiskUseCase:
    def __init__(self, students: StudentRepository) -> None:
        self._students = students

    async def execute(self, student_id: UUID) -> Student:
        student = await self._students.get_by_id(student_id)
        if student is None:
            raise ValueError(f"Student {student_id} not found")
        student.recalculate_risk()
        await self._students.save(student)
        return student
