"""Сценарии использования (Use Cases) для управления студентами.

Этот модуль реализует прикладные сценарии (Application Layer)
для операций CRUD над студентами и пересчёта уровня риска отчисления:

- **CreateStudentUseCase**: Создание профиля студента (привязка к User).
- **GetStudentUseCase**: Получение данных студента по ID.
- **ListStudentsUseCase**: Список студентов с фильтрацией и пагинацией.
- **UpdateStudentUseCase**: Обновление данных студента.
- **RecalculateRiskUseCase**: Пересчёт уровня риска (ML + fallback).

Все сценарии принимают зависимости через конструктор (Dependency Injection)
и работают с абстрактными репозиториями.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID, uuid4

from src.application.interfaces.repositories import Page, StudentRepository, UserRepository
from src.domain.lms.entities import BadgeLevel, RiskLevel, Student


@dataclass
class CreateStudentInput:
    """DTO для создания нового профиля студента.

    Attributes:
        user_id: Идентификатор учётной записи User, к которой
            привязывается профиль студента.
        phone: Номер телефона студента (опционально).
        parent_phone: Номер телефона родителя (опционально).
        student_code: Уникальный код студента (опционально).
    """

    user_id: UUID
    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


class CreateStudentUseCase:
    """Сценарий создания профиля студента.

    Создаёт доменную сущность Student и связывает её с существующей
    учётной записью User. Проверяет существование пользователя
    и отсутствие дублирующего профиля.

    Attributes:
        _students: Репозиторий студентов.
        _users: Репозиторий пользователей.
    """

    def __init__(self, students: StudentRepository, users: UserRepository) -> None:
        """Инициализирует сценарий с зависимостями от репозиториев.

        Args:
            students: Абстрактный репозиторий студентов.
            users: Абстрактный репозиторий пользователей.
        """
        self._students = students
        self._users = users

    async def execute(self, inp: CreateStudentInput) -> Student:
        """Создаёт новый профиль студента.

        Последовательность:
            1. Поиск учётной записи User по user_id.
            2. Проверка отсутствия существующего профиля студента.
            3. Создание сущности Student с именем из User.
            4. Сохранение через репозиторий.

        Args:
            inp: DTO с данными для создания студента.

        Returns:
            Student: Созданная доменная сущность студента.

        Raises:
            ValueError: Если пользователь не найден или профиль
                студента уже существует для данного user_id.
        """
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
    """Сценарий получения данных студента по идентификатору.

    Attributes:
        _students: Репозиторий студентов.
    """

    def __init__(self, students: StudentRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            students: Абстрактный репозиторий студентов.
        """
        self._students = students

    async def execute(self, student_id: UUID) -> Student:
        """Возвращает данные студента по его идентификатору.

        Args:
            student_id: UUID студента.

        Returns:
            Student: Доменная сущность студента.

        Raises:
            ValueError: Если студент с указанным ID не найден.
        """
        student = await self._students.get_by_id(student_id)
        if student is None:
            raise ValueError(f"Student {student_id} not found")
        return student


class ListStudentsUseCase:
    """Сценарий получения списка студентов с фильтрацией и пагинацией.

    Поддерживает фильтрацию по направлению, уровню риска и текстовый
    поиск по имени/коду студента.

    Attributes:
        _students: Репозиторий студентов.
    """

    def __init__(self, students: StudentRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            students: Абстрактный репозиторий студентов.
        """
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
        """Возвращает пагинированный список студентов.

        Args:
            direction_id: Фильтр по направлению обучения (опционально).
            risk_level: Фильтр по уровню риска — "low", "medium",
                "high", "critical" (опционально).
            search: Текстовый поиск по имени или коду студента
                (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице (по умолчанию 20).

        Returns:
            Page[Student]: Пагинированный результат с элементами,
                общим количеством и метаинформацией о страницах.
        """
        return await self._students.list(
            direction_id=direction_id,
            risk_level=risk_level,
            search=search,
            page=page,
            page_size=page_size,
        )


@dataclass
class UpdateStudentInput:
    """DTO для обновления данных студента.

    Все поля опциональны — обновляются только переданные значения
    (partial update).

    Attributes:
        phone: Новый номер телефона (опционально).
        parent_phone: Новый телефон родителя (опционально).
        student_code: Новый код студента (опционально).
    """

    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


class UpdateStudentUseCase:
    """Сценарий обновления данных студента.

    Выполняет частичное обновление (partial update) — изменяются
    только переданные поля.

    Attributes:
        _students: Репозиторий студентов.
    """

    def __init__(self, students: StudentRepository) -> None:
        """Инициализирует сценарий с зависимостью от репозитория.

        Args:
            students: Абстрактный репозиторий студентов.
        """
        self._students = students

    async def execute(self, student_id: UUID, inp: UpdateStudentInput) -> Student:
        """Обновляет данные студента.

        Загружает текущую сущность, применяет изменения только
        для непустых (not None) полей и сохраняет результат.

        Args:
            student_id: UUID студента для обновления.
            inp: DTO с обновляемыми полями.

        Returns:
            Student: Обновлённая доменная сущность студента.

        Raises:
            ValueError: Если студент с указанным ID не найден.
        """
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
    """Сценарий пересчёта уровня риска отчисления студента.

    Поддерживает два режима:
        1. **ML-модель** (основной): использует MLRiskScorer для
           извлечения фичей и предсказания вероятности отчисления.
        2. **Пороговые значения** (fallback): при недоступности
           ML-модели использует RiskCalculationPolicy.calculate().

    При изменении уровня риска генерирует доменное событие
    StudentRiskChangedEvent для оповещения заинтересованных сторон.

    Attributes:
        _students: Репозиторий студентов.
        _session: Асинхронная сессия SQLAlchemy (необходима для
            ML-модели для извлечения фичей из БД). Если None —
            используется fallback-логика.
    """

    def __init__(self, students: StudentRepository, session: object | None = None) -> None:
        """Инициализирует сценарий с зависимостями.

        Args:
            students: Абстрактный репозиторий студентов.
            session: AsyncSession SQLAlchemy для ML-модели (опционально).
                Если None — будет использована fallback-логика.
        """
        self._students = students
        self._session = session  # AsyncSession for ML feature extraction

    async def execute(self, student_id: UUID) -> Student:
        """Пересчитывает уровень риска отчисления студента.

        Алгоритм:
            1. Загрузка сущности студента из репозитория.
            2. Попытка расчёта через ML-модель (если session доступна).
            3. При ошибке ML — fallback на пороговые значения.
            4. Если уровень изменился — генерация StudentRiskChangedEvent.
            5. Сохранение обновлённой сущности.

        Args:
            student_id: UUID студента для пересчёта.

        Returns:
            Student: Обновлённая сущность с актуальным уровнем риска.

        Raises:
            ValueError: Если студент с указанным ID не найден.
        """
        student = await self._students.get_by_id(student_id)
        if student is None:
            raise ValueError(f"Student {student_id} not found")

        old_level = student.risk_level

        if self._session is not None:
            try:
                from src.ml.risk_scorer import MLRiskScorer
                scorer = MLRiskScorer(self._session)
                result = await scorer.score_student(student_id)
                student.risk_level = result.risk_level
            except Exception:
                # Fallback на пороговые значения при ошибке ML-модели
                student.recalculate_risk()
        else:
            student.recalculate_risk()

        if student.risk_level != old_level:
            from src.domain.lms.events import StudentRiskChangedEvent
            student.add_event(StudentRiskChangedEvent(
                student_id=student.id,
                old_level=old_level,
                new_level=student.risk_level,
            ))

        await self._students.save(student)
        return student
