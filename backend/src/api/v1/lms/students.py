"""CRUD-эндпоинты для управления студентами и ML-оценка рисков.

Предоставляет REST API для:
    - Создания, получения, обновления и списка студентов.
    - Пересчёта и получения детального ML-анализа рисков отчисления.
    - Сброса пароля студента с генерацией нового.
    - Управления зачислениями (enrollment): получение групп, зачисление, перевод.

Доступ: директор, МУП, преподаватель (StaffGuard).
Преподаватель видит только студентов своих направлений (фильтр по teacherId).

Роуты:
    POST /students — создание студента.
    GET /students — список с фильтрацией и пагинацией.
    GET /students/{id} — получение студента по ID.
    PATCH /students/{id} — обновление данных студента.
    POST /students/{id}/recalculate-risk — пересчёт ML-риска.
    GET /students/{id}/risk — детальная ML-разбивка факторов риска.
    POST /students/{id}/reset-password — сброс пароля студента.
    GET /students/{id}/groups — текущие и доступные группы.
    POST /students/{id}/enroll — зачисление в группу.
    POST /students/{id}/transfer — перевод между группами.
"""
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
"""Гвард: доступ для директора, МУП и преподавателя."""


class StudentResponse(BaseModel):
    """Ответ с данными студента (camelCase для фронтенда).

    Содержит основную информацию, контакты, геймификацию и
    академические показатели студента.

    Attributes:
        id: UUID студента.
        userId: UUID связанного пользователя (для авторизации).
        studentCode: Уникальный код студента.
        fullName: Полное имя (ФИО).
        phone: Телефон студента.
        email: Email студента.
        photoUrl: URL фотографии.
        dateOfBirth: Дата рождения (ISO формат).
        parentName: ФИО родителя/опекуна.
        parentPhone: Телефон родителя.
        address: Адрес проживания.
        riskLevel: Уровень риска отчисления (low, medium, high, critical).
        stars: Звёзды геймификации.
        crystals: Кристаллы (бриллианты) геймификации.
        totalCoins: Общее количество монет.
        badgeLevel: Уровень бейджа (bronze, silver, gold, platinum, diamond).
        gpa: Средний балл (10-балльная шкала).
        attendancePercent: Процент посещаемости.
        groupCount: Количество активных зачислений в группы.
    """
    id: UUID
    userId: UUID | None = None
    studentCode: str | None = None
    fullName: str = ""
    phone: str | None = None
    email: str | None = None
    photoUrl: str | None = None
    dateOfBirth: str | None = None
    parentName: str | None = None
    parentPhone: str | None = None
    address: str | None = None
    riskLevel: str = "low"
    stars: int = 0
    crystals: int = 0
    totalCoins: int = 0
    badgeLevel: str = "bronze"
    gpa: float | None = None
    attendancePercent: float | None = None
    groupCount: int = 0

    @classmethod
    def from_model(cls, m, group_count: int = 0) -> "StudentResponse":  # type: ignore[no-untyped-def]
        """Создаёт StudentResponse из ORM-модели StudentModel.

        Args:
            m: ORM-модель StudentModel.
            group_count: Количество активных зачислений (из bulk-запроса).

        Returns:
            StudentResponse: Сериализованный ответ для фронтенда.
        """
        return cls(
            id=m.id,
            userId=m.user_id,
            studentCode=m.student_code,
            fullName=m.full_name or "",
            phone=m.phone,
            email=getattr(m, "email", None),
            photoUrl=getattr(m, "photo_url", None),
            dateOfBirth=str(m.date_of_birth) if getattr(m, "date_of_birth", None) else None,
            parentName=getattr(m, "parent_name", None),
            parentPhone=m.parent_phone,
            address=getattr(m, "address", None),
            riskLevel=m.risk_level or "low",
            stars=m.stars or 0,
            crystals=m.crystals or 0,
            totalCoins=m.coins or 0,
            badgeLevel=m.badge_level or "bronze",
            gpa=float(m.gpa) if m.gpa is not None else None,
            attendancePercent=float(m.attendance_percent) if m.attendance_percent is not None else None,
            groupCount=group_count,
        )


class PagedStudents(BaseModel):
    """Пагинированный список студентов.

    Attributes:
        data: Массив студентов на текущей странице.
        total: Общее количество студентов (с учётом фильтров).
        page: Текущая страница.
        limit: Размер страницы.
        totalPages: Общее количество страниц.
    """
    data: list[StudentResponse]
    total: int
    page: int
    limit: int
    totalPages: int


class CreateStudentRequest(BaseModel):
    """Запрос на создание нового студента.

    Attributes:
        user_id: UUID пользователя для привязки учётной записи.
        phone: Телефон студента (опционально).
        parent_phone: Телефон родителя (опционально).
        student_code: Уникальный код студента (опционально, автогенерация).
    """
    user_id: UUID
    phone: str | None = None
    parent_phone: str | None = None
    student_code: str | None = None


class UpdateStudentRequest(BaseModel):
    """Запрос на обновление данных студента (camelCase).

    Все поля опциональны — обновляются только переданные.

    Attributes:
        fullName: Новое полное имя.
        phone: Новый телефон.
        email: Новый email.
        dateOfBirth: Новая дата рождения (ISO).
        parentName: Новое ФИО родителя.
        parentPhone: Новый телефон родителя.
        address: Новый адрес.
        studentCode: Новый код студента.
    """
    fullName: str | None = None
    phone: str | None = None
    email: str | None = None
    dateOfBirth: str | None = None
    parentName: str | None = None
    parentPhone: str | None = None
    address: str | None = None
    studentCode: str | None = None


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    body: CreateStudentRequest,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    """Создание нового студента.

    Создаёт запись студента, привязанную к существующему пользователю.
    Пользователь должен существовать и иметь роль 'student'.

    Args:
        body: Данные для создания (user_id, phone, parent_phone, student_code).
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        StudentResponse: Созданный студент.

    Raises:
        HTTPException: 400 — если user_id невалиден или уже привязан.
    """
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
    m = (await db.execute(
        select(StudentModel).where(StudentModel.id == student.id)
    )).scalar_one()
    return StudentResponse.from_model(m)


@router.get("", response_model=PagedStudents)
async def list_students(
    _: StaffGuard,
    db: DbSession,
    direction_id: UUID | None = Query(None, alias="directionId"),
    teacher_id: UUID | None = Query(None, alias="teacherId"),
    risk_level: str | None = Query(None, alias="riskLevel"),
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PagedStudents:
    """Получение списка студентов с фильтрацией и пагинацией.

    Поддерживает фильтры: по направлению, по преподавателю (его направления),
    по уровню риска и текстовый поиск по имени/телефону/коду.

    При передаче teacherId фильтрация происходит по цепочке:
    преподаватель → его предметы → направления → группы → зачисленные студенты.

    Для каждого студента дополнительно подсчитывается количество
    активных зачислений (groupCount) через bulk GROUP BY.

    Args:
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.
        direction_id: Фильтр по UUID направления (camelCase alias: directionId).
        teacher_id: Фильтр по UUID преподавателя (camelCase alias: teacherId).
        risk_level: Фильтр по уровню риска (low, medium, high, critical).
        search: Текстовый поиск (ILIKE по имени, телефону, коду).
        page: Номер страницы (>= 1).
        page_size: Размер страницы (1-100).

    Returns:
        PagedStudents: Пагинированный список с общим количеством.
    """
    from sqlalchemy import func as fn
    from src.infrastructure.persistence.models.lms import SubjectModel, EnrollmentModel, GroupModel

    q = select(StudentModel)

    # If teacherId — find students in groups whose direction matches teacher's subjects
    if teacher_id:
        teacher_dir_ids = (await db.execute(
            select(SubjectModel.direction_id).where(
                SubjectModel.teacher_id == teacher_id,
                SubjectModel.direction_id != None,  # noqa: E711
            ).distinct()
        )).scalars().all()
        if teacher_dir_ids:
            # Students enrolled in groups of those directions
            group_ids_q = select(GroupModel.id).where(GroupModel.direction_id.in_(teacher_dir_ids))
            enrolled_student_ids = select(EnrollmentModel.student_id).where(
                EnrollmentModel.group_id.in_(group_ids_q),
                EnrollmentModel.is_active == True,  # noqa: E712
            ).distinct()
            q = q.where(StudentModel.id.in_(enrolled_student_ids))
        else:
            q = q.where(False)  # teacher has no subjects → no students

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

    # Bulk count enrollments
    student_ids = [m.id for m in rows]
    enroll_counts: dict = {}
    if student_ids:
        enroll_rows = (await db.execute(
            select(EnrollmentModel.student_id, fn.count(EnrollmentModel.id).label("cnt"))
            .where(EnrollmentModel.student_id.in_(student_ids), EnrollmentModel.is_active == True)  # noqa: E712
            .group_by(EnrollmentModel.student_id)
        )).all()
        enroll_counts = {r.student_id: r.cnt for r in enroll_rows}

    return PagedStudents(
        data=[StudentResponse.from_model(m, group_count=enroll_counts.get(m.id, 0)) for m in rows],
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
    """Получение данных студента по UUID.

    Args:
        student_id: UUID студента.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        StudentResponse: Данные студента.

    Raises:
        HTTPException: 404 — если студент не найден.
    """
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
    """Обновление данных студента.

    Обновляет только переданные (не None) поля. Поддерживает обновление
    ФИО, контактов, адреса и кода студента.

    Args:
        student_id: UUID студента для обновления.
        body: Поля для обновления (camelCase).
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        StudentResponse: Обновлённые данные студента.

    Raises:
        HTTPException: 404 — если студент не найден.
    """
    from datetime import date as _date
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")
    if body.fullName is not None:
        m.full_name = body.fullName
    if body.phone is not None:
        m.phone = body.phone
    if body.email is not None:
        m.email = body.email
    if body.dateOfBirth is not None:
        try:
            m.date_of_birth = _date.fromisoformat(body.dateOfBirth)
        except ValueError:
            pass
    if body.parentName is not None:
        m.parent_name = body.parentName
    if body.parentPhone is not None:
        m.parent_phone = body.parentPhone
    if body.address is not None:
        m.address = body.address
    if body.studentCode is not None:
        m.student_code = body.studentCode
    await db.commit()
    await db.refresh(m)
    return StudentResponse.from_model(m)


@router.post("/{student_id}/recalculate-risk", response_model=StudentResponse)
async def recalculate_risk(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> StudentResponse:
    """Пересчёт ML-уровня риска отчисления студента.

    Запускает ML-скоринг на основе посещаемости, оценок, домашних заданий
    и финансовой истории. Обновляет поле risk_level студента.

    Args:
        student_id: UUID студента.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        StudentResponse: Данные студента с обновлённым уровнем риска.

    Raises:
        HTTPException: 404 — если студент не найден.
    """
    uc = RecalculateRiskUseCase(SqlStudentRepository(db), session=db)
    try:
        await uc.execute(student_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    await db.commit()
    m = (await db.execute(
        select(StudentModel).where(StudentModel.id == student_id)
    )).scalar_one()
    return StudentResponse.from_model(m)


class RiskDetailsResponse(BaseModel):
    """Детализация факторов риска отчисления.

    Attributes:
        attendancePercent14d: Процент посещаемости за последние 14 дней.
        avgGradeLast5: Средняя из последних 5 оценок.
        missedHomeworkStreak: Серия пропущенных домашних заданий подряд.
        debtDays: Количество дней просрочки оплаты.
        dropoutProbability: Вероятность отчисления (0.0 - 1.0).
    """
    attendancePercent14d: float
    avgGradeLast5: float
    missedHomeworkStreak: int
    debtDays: int
    dropoutProbability: float


class RiskFactorsResponse(BaseModel):
    """Полный ML-анализ факторов риска студента.

    Attributes:
        studentId: UUID студента (строка).
        attendanceScore: Оценка по посещаемости (low/medium/high/critical).
        gradesScore: Оценка по успеваемости.
        homeworkScore: Оценка по домашним заданиям.
        paymentScore: Оценка по оплате.
        overallRisk: Общий уровень риска.
        calculatedAt: Дата и время расчёта (ISO).
        details: Детализация числовых показателей.
    """
    studentId: str
    attendanceScore: str
    gradesScore: str
    homeworkScore: str
    paymentScore: str
    overallRisk: str
    calculatedAt: str
    details: RiskDetailsResponse


@router.get("/{student_id}/risk", response_model=RiskFactorsResponse)
async def get_student_risk(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> RiskFactorsResponse:
    """Получение детальной ML-разбивки факторов риска студента.

    Запускает ML-скоринг в реальном времени и возвращает разбивку
    по категориям: посещаемость, оценки, домашние задания, оплата.

    Args:
        student_id: UUID студента.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        RiskFactorsResponse: Детальная разбивка с вероятностью отчисления.

    Raises:
        HTTPException: 404 — если студент не найден.
        HTTPException: 503 — если ML-модуль недоступен.
    """
    m = (await db.execute(
        select(StudentModel).where(StudentModel.id == student_id)
    )).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")

    try:
        from src.ml.risk_scorer import MLRiskScorer
        scorer = MLRiskScorer(db)
        result = await scorer.score_student(student_id)
        return RiskFactorsResponse(
            studentId=str(student_id),
            attendanceScore=result.attendance_score.value,
            gradesScore=result.grades_score.value,
            homeworkScore=result.homework_score.value,
            paymentScore=result.payment_score.value,
            overallRisk=result.risk_level.value,
            calculatedAt=result.computed_at.isoformat(),
            details=RiskDetailsResponse(
                attendancePercent14d=result.details["attendancePercent14d"],
                avgGradeLast5=result.details["avgGradeLast5"],
                missedHomeworkStreak=result.details["missedHomeworkStreak"],
                debtDays=result.details["debtDays"],
                dropoutProbability=result.details["dropoutProbability"],
            ),
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"ML risk scoring unavailable: {e}",
        )


@router.post("/{student_id}/reset-password")
async def reset_student_password(
    student_id: UUID,
    _: StaffGuard,
    db: DbSession,
) -> dict:  # type: ignore[type-arg]
    """Сброс пароля студента с генерацией нового.

    Генерирует криптографически стойкий пароль длиной 10 символов,
    содержащий заглавные и строчные буквы, цифры и спецсимволы.
    Хеширует и сохраняет новый пароль.

    Args:
        student_id: UUID студента.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        dict: {"login": email, "password": новый_пароль} — для передачи студенту.

    Raises:
        HTTPException: 404 — если студент или его учётная запись не найдены.
        HTTPException: 400 — если у студента нет привязанного пользователя.
    """
    import secrets, string
    from src.infrastructure.persistence.models.auth import UserModel
    from src.infrastructure.services.password_service import hash_password

    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")
    if m.user_id is None:
        raise HTTPException(status_code=400, detail="Student has no user account")

    user = (await db.execute(select(UserModel).where(UserModel.id == m.user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User account not found")

    # Generate new password
    chars = string.ascii_letters + string.digits + "!@#$"
    pw = [secrets.choice(string.ascii_uppercase), secrets.choice(string.ascii_lowercase),
          secrets.choice(string.digits), secrets.choice("!@#$")]
    pw += [secrets.choice(chars) for _ in range(6)]
    secrets.SystemRandom().shuffle(pw)
    new_password = "".join(pw)

    user.password_hash = hash_password(new_password)
    await db.commit()

    return {"login": user.email, "password": new_password}


# ── Student Groups (enrollments + transfer) ──────────────────────────────────

@router.get("/{student_id}/groups")
async def get_student_groups(
    student_id: UUID, _: StaffGuard, db: DbSession,
) -> dict:  # type: ignore[type-arg]
    """Получение текущих зачислений и доступных групп для студента.

    Возвращает два списка:
    1. currentGroups — текущие зачисления с информацией о группе
       и направлении (активные и неактивные).
    2. availableGroups — все активные группы с пометкой, зачислен ли
       студент в каждую из них.

    Args:
        student_id: UUID студента.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        dict: {"currentGroups": [...], "availableGroups": [...]}.

    Raises:
        HTTPException: 404 — если студент не найден.
    """
    from src.infrastructure.persistence.models.lms import EnrollmentModel, GroupModel, SubjectModel, DirectionModel
    from src.infrastructure.persistence.models.crm import ContractModel
    from sqlalchemy import func as fn

    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Current enrollments with group info
    enrollments = (await db.execute(
        select(EnrollmentModel, GroupModel)
        .join(GroupModel, GroupModel.id == EnrollmentModel.group_id)
        .where(EnrollmentModel.student_id == student_id)
        .order_by(EnrollmentModel.enrolled_at.desc())
    )).all()

    # Resolve direction names
    dir_ids = {grp.direction_id for _, grp in enrollments if grp.direction_id}
    dir_map: dict = {}
    if dir_ids:
        dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(dir_ids)))).scalars().all()
        dir_map = {d.id: d.name for d in dirs}

    current_groups = []
    for enr, grp in enrollments:
        current_groups.append({
            "enrollmentId": str(enr.id),
            "groupId": str(grp.id),
            "groupName": grp.name,
            "directionName": dir_map.get(grp.direction_id),
            "isActive": enr.is_active,
            "enrolledAt": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
            "droppedAt": enr.dropped_at.isoformat() if enr.dropped_at else None,
        })

    # Available groups: all active groups not yet enrolled
    enrolled_group_ids = {g["groupId"] for g in current_groups if g["isActive"]}
    all_groups = (await db.execute(
        select(GroupModel).where(GroupModel.is_active == True)  # noqa: E712
    )).scalars().all()

    # Resolve all direction names
    all_dir_ids = {g.direction_id for g in all_groups if g.direction_id} - set(dir_map.keys())
    if all_dir_ids:
        extra_dirs = (await db.execute(select(DirectionModel).where(DirectionModel.id.in_(all_dir_ids)))).scalars().all()
        for d in extra_dirs:
            dir_map[d.id] = d.name

    available_groups = []
    for grp in all_groups:
        available_groups.append({
            "groupId": str(grp.id),
            "groupName": grp.name,
            "directionName": dir_map.get(grp.direction_id),
            "isEnrolled": str(grp.id) in enrolled_group_ids,
        })

    return {"currentGroups": current_groups, "availableGroups": available_groups}


@router.post("/{student_id}/enroll")
async def enroll_student(
    student_id: UUID, _: StaffGuard, db: DbSession,
    groupId: str = "",
) -> dict:  # type: ignore[type-arg]
    """Зачисление студента в группу.

    Проверяет существование студента и группы, соответствие направления
    группы активному договору студента, и отсутствие дублирующего зачисления.

    Args:
        student_id: UUID студента.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.
        groupId: UUID группы (строка, из query-параметра).

    Returns:
        dict: {"message": "Enrolled successfully"}.

    Raises:
        HTTPException: 400 — если groupId не указан или направление не совпадает.
        HTTPException: 404 — если студент или группа не найдены.
        HTTPException: 409 — если студент уже зачислен в группу.
    """
    from src.infrastructure.persistence.models.lms import EnrollmentModel, GroupModel, SubjectModel
    from src.infrastructure.persistence.models.crm import ContractModel
    from uuid import uuid4 as _uid
    from datetime import datetime, timezone

    if not groupId:
        raise HTTPException(status_code=400, detail="groupId is required")
    group_uuid = UUID(groupId)

    # Verify student exists
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify group exists
    grp = (await db.execute(select(GroupModel).where(GroupModel.id == group_uuid))).scalar_one_or_none()
    if grp is None:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check direction constraint from contracts
    if grp.direction_id:
        allowed_dirs = (await db.execute(
            select(ContractModel.direction_id).where(
                ContractModel.student_id == student_id, ContractModel.status == "active",
                ContractModel.direction_id.isnot(None),
            ).distinct()
        )).scalars().all()
        if allowed_dirs and grp.direction_id not in allowed_dirs:
            raise HTTPException(status_code=400, detail="Student contract does not include this direction")

    # Check not already enrolled
    existing = (await db.execute(
        select(EnrollmentModel).where(
            EnrollmentModel.student_id == student_id,
            EnrollmentModel.group_id == group_uuid,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled in this group")

    db.add(EnrollmentModel(
        id=_uid(), student_id=student_id, group_id=group_uuid,
        enrolled_at=datetime.now(timezone.utc), is_active=True,
    ))
    await db.commit()
    return {"message": "Enrolled successfully"}


@router.post("/{student_id}/transfer")
async def transfer_student(
    student_id: UUID, _: StaffGuard, db: DbSession,
    fromGroupId: str = "", toGroupId: str = "",
) -> dict:  # type: ignore[type-arg]
    """Перевод студента из одной группы в другую.

    Деактивирует текущее зачисление (is_active=False, dropped_at=now)
    и создаёт новое зачисление в целевой группе. Проверяет соответствие
    направления целевой группы активному договору.

    Args:
        student_id: UUID студента.
        _: Гвард доступа персонала.
        db: Асинхронная сессия SQLAlchemy.
        fromGroupId: UUID исходной группы (строка).
        toGroupId: UUID целевой группы (строка).

    Returns:
        dict: {"message": "Transferred successfully"}.

    Raises:
        HTTPException: 400 — если ID групп не указаны или направление
            целевой группы не покрывается договором.
        HTTPException: 404 — если студент или целевая группа не найдены.
    """
    from src.infrastructure.persistence.models.lms import EnrollmentModel, GroupModel, SubjectModel
    from src.infrastructure.persistence.models.crm import ContractModel
    from uuid import uuid4 as _uid
    from datetime import datetime, timezone

    if not fromGroupId or not toGroupId:
        raise HTTPException(status_code=400, detail="fromGroupId and toGroupId required")

    from_uuid = UUID(fromGroupId)
    to_uuid = UUID(toGroupId)

    # Verify student
    m = (await db.execute(select(StudentModel).where(StudentModel.id == student_id))).scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Student not found")

    # Verify target group direction is allowed
    to_grp = (await db.execute(select(GroupModel).where(GroupModel.id == to_uuid))).scalar_one_or_none()
    if to_grp is None:
        raise HTTPException(status_code=404, detail="Target group not found")
    if to_grp.direction_id:
        allowed_dirs = (await db.execute(
            select(ContractModel.direction_id).where(
                ContractModel.student_id == student_id, ContractModel.status == "active",
                ContractModel.direction_id.isnot(None),
            ).distinct()
        )).scalars().all()
        if allowed_dirs and to_grp.direction_id not in allowed_dirs:
            raise HTTPException(status_code=400, detail="Student contract does not include target direction")

    # Deactivate old enrollment
    now = datetime.now(timezone.utc)
    old_enr = (await db.execute(
        select(EnrollmentModel).where(
            EnrollmentModel.student_id == student_id,
            EnrollmentModel.group_id == from_uuid,
            EnrollmentModel.is_active == True,  # noqa: E712
        )
    )).scalar_one_or_none()
    if old_enr:
        old_enr.is_active = False
        old_enr.dropped_at = now

    # Create new enrollment
    db.add(EnrollmentModel(
        id=_uid(), student_id=student_id, group_id=to_uuid,
        enrolled_at=now, is_active=True,
    ))
    await db.commit()
    return {"message": "Transferred successfully"}
