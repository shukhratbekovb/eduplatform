"""Unit tests — LMS Student use cases (in-memory repos)."""
from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import uuid4

import pytest

from src.application.interfaces.repositories import Page
from src.application.lms.students.use_cases import (
    CreateStudentInput,
    CreateStudentUseCase,
    GetStudentUseCase,
    RecalculateRiskUseCase,
    UpdateStudentInput,
    UpdateStudentUseCase,
)
from src.domain.auth.entities import User, UserRole
from src.domain.lms.entities import RiskLevel, Student
from src.domain.shared.value_objects import Email


# ── In-memory stubs ───────────────────────────────────────────────────────────

class InMemoryStudentRepo:
    def __init__(self) -> None:
        self._store: dict[Any, Student] = {}

    async def get_by_id(self, sid: Any) -> Student | None:
        return self._store.get(sid)

    async def get_by_user_id(self, uid: Any) -> Student | None:
        for s in self._store.values():
            if s.user_id == uid:
                return s
        return None

    async def save(self, student: Student) -> None:
        self._store[student.id] = student

    async def list(self, **kw: Any) -> Page[Student]:
        items = list(self._store.values())
        return Page(items=items, total=len(items), page=1, page_size=20)


class InMemoryUserRepo:
    def __init__(self) -> None:
        self._store: dict[Any, User] = {}

    async def get_by_id(self, uid: Any) -> User | None:
        return self._store.get(uid)

    async def get_by_email(self, email: str) -> User | None:
        return None

    async def save(self, user: User) -> None:
        self._store[user.id] = user

    async def list(self, **kw: Any) -> Page[User]:
        return Page(items=[], total=0, page=1, page_size=20)


def _make_user(name: str = "Alisher") -> User:
    return User(
        id=uuid4(),
        email=Email(f"{uuid4().hex[:6]}@test.com"),
        password_hash="hash",
        name=name,
        role=UserRole.STUDENT,
        is_active=True,
    )


# ── CreateStudentUseCase ──────────────────────────────────────────────────────

class TestCreateStudentUseCase:
    async def test_creates_student(self) -> None:
        students = InMemoryStudentRepo()
        users = InMemoryUserRepo()
        user = _make_user("Bobur")
        await users.save(user)

        uc = CreateStudentUseCase(students, users)
        student = await uc.execute(CreateStudentInput(user_id=user.id, phone="+998901234567"))
        assert student.full_name == "Bobur"
        assert student.user_id == user.id

    async def test_unknown_user_raises(self) -> None:
        uc = CreateStudentUseCase(InMemoryStudentRepo(), InMemoryUserRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(CreateStudentInput(user_id=uuid4()))

    async def test_duplicate_profile_raises(self) -> None:
        students = InMemoryStudentRepo()
        users = InMemoryUserRepo()
        user = _make_user()
        await users.save(user)

        uc = CreateStudentUseCase(students, users)
        await uc.execute(CreateStudentInput(user_id=user.id))

        with pytest.raises(ValueError, match="already exists"):
            await uc.execute(CreateStudentInput(user_id=user.id))


# ── GetStudentUseCase ─────────────────────────────────────────────────────────

class TestGetStudentUseCase:
    async def test_get_existing(self) -> None:
        students = InMemoryStudentRepo()
        s = Student(id=uuid4(), user_id=uuid4(), full_name="Test")
        await students.save(s)

        uc = GetStudentUseCase(students)
        result = await uc.execute(s.id)
        assert result.id == s.id

    async def test_missing_raises(self) -> None:
        uc = GetStudentUseCase(InMemoryStudentRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())


# ── UpdateStudentUseCase ──────────────────────────────────────────────────────

class TestUpdateStudentUseCase:
    async def test_update_phone(self) -> None:
        students = InMemoryStudentRepo()
        s = Student(id=uuid4(), user_id=uuid4(), full_name="Alisher", phone="+998901111111")
        await students.save(s)

        uc = UpdateStudentUseCase(students)
        updated = await uc.execute(s.id, UpdateStudentInput(phone="+998902222222"))
        assert updated.phone == "+998902222222"

    async def test_update_missing_raises(self) -> None:
        uc = UpdateStudentUseCase(InMemoryStudentRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4(), UpdateStudentInput(phone="+998901234567"))


# ── RecalculateRiskUseCase ────────────────────────────────────────────────────

class TestRecalculateRiskUseCase:
    async def test_recalculates_and_saves(self) -> None:
        students = InMemoryStudentRepo()
        s = Student(
            id=uuid4(), user_id=uuid4(), full_name="At Risk",
            attendance_percent=Decimal("40"), gpa=Decimal("3"),
        )
        await students.save(s)

        uc = RecalculateRiskUseCase(students)
        result = await uc.execute(s.id)
        assert result.risk_level == RiskLevel.HIGH
        saved = await students.get_by_id(s.id)
        assert saved is not None and saved.risk_level == RiskLevel.HIGH

    async def test_missing_raises(self) -> None:
        uc = RecalculateRiskUseCase(InMemoryStudentRepo())
        with pytest.raises(ValueError, match="not found"):
            await uc.execute(uuid4())
