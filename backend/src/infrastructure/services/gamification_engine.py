"""Движок геймификации — автоматическое начисление звёзд/кристаллов, проверка достижений, обновление бейджей.

Центральный модуль системы мотивации студентов. Вызывается из:
    - conduct_lesson: при проведении урока (посещаемость + оценки).
    - grade_homework: при проверке домашнего задания (оценка).
    - submit_homework: при своевременной сдаче домашки.

Правила начисления звёзд:
    - Посещение (present): +5 звёзд.
    - Опоздание (late): -2 звезды.
    - Оценка за урок 9-10: +10 звёзд.
    - Оценка за урок 7-8: +5 звёзд.
    - Домашка сдана вовремя: +15 звёзд.
    - Оценка за домашку 9-10: +20 звёзд.
    - Оценка за домашку 7-8: +10 звёзд.

Правила начисления кристаллов:
    - Серия 5 уроков подряд (present/late): +5 кристаллов.
    - Серия 10 уроков подряд: +15 кристаллов.
    - Ручное начисление преподавателем через conduct.

Бейджи (по сумме звёзд):
    - Bronze: 0+ звёзд.
    - Silver: 100+ звёзд.
    - Gold: 300+ звёзд.
    - Platinum: 600+ звёзд.
    - Diamond: 1000+ звёзд.

Автоматические достижения (триггеры):
    - first_grade: первая оценка.
    - five_tens: 5 десяток.
    - gpa_9: GPA >= 9.0.
    - ten_present: 10 уроков подряд.
    - thirty_present: 30 уроков подряд.
    - ten_homework: 10 домашек вовремя.
    - leaderboard_first: 1 место в рейтинге.

Example:
    >>> from src.infrastructure.services.gamification_engine import on_lesson_conducted
    >>> await on_lesson_conducted(
    ...     student_id=student_uuid,
    ...     attendance_status="present",
    ...     grade=9.5,
    ...     lesson_id=lesson_uuid,
    ...     subject_id=subject_uuid,
    ...     lesson_topic="Основы Python",
    ...     db=session,
    ... )
"""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.persistence.models.gamification import (
    AchievementModel,
    StudentAchievementModel,
    StudentActivityEventModel,
)
from src.infrastructure.persistence.models.lms import (
    AttendanceRecordModel,
    GradeRecordModel,
    HomeworkSubmissionModel,
    StudentModel,
)

# ── Star rules ───────────────────────────────────────────────────────────────

STARS_ATTENDANCE_PRESENT = 5
"""Количество звёзд за присутствие на уроке."""

STARS_ATTENDANCE_LATE = -2
"""Количество звёзд за опоздание на урок (штраф)."""

STARS_GRADE_EXCELLENT = 10
"""Количество звёзд за отличную оценку на уроке (9-10 баллов)."""

STARS_GRADE_GOOD = 5
"""Количество звёзд за хорошую оценку на уроке (7-8 баллов)."""

STARS_HOMEWORK_ON_TIME = 15
"""Количество звёзд за своевременную сдачу домашнего задания."""

STARS_HOMEWORK_GRADE_EXCELLENT = 20
"""Количество звёзд за отличную оценку за домашку (9-10 баллов)."""

STARS_HOMEWORK_GRADE_GOOD = 10
"""Количество звёзд за хорошую оценку за домашку (7-8 баллов)."""

# ── Badge thresholds ─────────────────────────────────────────────────────────

BADGE_THRESHOLDS = [
    (1000, "diamond"),
    (600, "platinum"),
    (300, "gold"),
    (100, "silver"),
    (0, "bronze"),
]
"""Пороги для автоматического повышения уровня бейджа.

Формат: (минимальное_количество_звёзд, уровень_бейджа).
Проверяется сверху вниз — первый подходящий порог применяется.
"""

# ── Achievement triggers ─────────────────────────────────────────────────────

TRIGGER_CHECKS = {
    "first_grade": lambda ctx: ctx["total_grades"] >= 1,
    "five_tens": lambda ctx: ctx["tens_count"] >= 5,
    "gpa_9": lambda ctx: (ctx["gpa"] or 0) >= 9.0,
    "ten_present": lambda ctx: ctx["streak_present"] >= 10,
    "thirty_present": lambda ctx: ctx["streak_present"] >= 30,
    "ten_homework": lambda ctx: ctx["hw_on_time"] >= 10,
    "first_day_homework": lambda ctx: ctx.get("submitted_first_day", False),
    "leaderboard_first": lambda ctx: ctx.get("leaderboard_rank") == 1,
}
"""Словарь функций-проверок для автоматической разблокировки достижений.

Ключ — trigger_type из AchievementModel, значение — лямбда,
принимающая контекст (dict) и возвращающая bool.
"""


# ── Core engine ──────────────────────────────────────────────────────────────


async def _add_stars(
    student: StudentModel,
    amount: int,
    description: str,
    db: AsyncSession,
    subject_id: UUID | None = None,
    lesson_id: UUID | None = None,
) -> None:
    """Начисляет звёзды студенту и создаёт событие в ленте активности.

    Если amount == 0, операция пропускается. Поддерживает как
    положительные (начисление), так и отрицательные (штраф) значения.

    Args:
        student: ORM-модель студента для обновления баланса.
        amount: Количество звёзд (может быть отрицательным для штрафа).
        description: Текстовое описание причины начисления.
        db: Асинхронная сессия SQLAlchemy.
        subject_id: UUID предмета для привязки события (опционально).
        lesson_id: UUID урока для привязки события (опционально).
    """
    if amount == 0:
        return
    student.stars = (student.stars or 0) + amount
    db.add(
        StudentActivityEventModel(
            id=uuid4(),
            student_id=student.id,
            type="stars_earned",
            description=description,
            stars_amount=amount,
            crystals_amount=None,
            subject_id=subject_id,
            linked_lesson_id=lesson_id,
            created_at=datetime.now(UTC),
        )
    )


async def _add_crystals(student: StudentModel, amount: int, description: str, db: AsyncSession) -> None:
    """Начисляет кристаллы (бриллианты) студенту и создаёт событие.

    Начисление происходит только при amount > 0.

    Args:
        student: ORM-модель студента для обновления баланса.
        amount: Количество кристаллов для начисления.
        description: Текстовое описание причины начисления.
        db: Асинхронная сессия SQLAlchemy.
    """
    if amount <= 0:
        return
    student.crystals = (student.crystals or 0) + amount
    db.add(
        StudentActivityEventModel(
            id=uuid4(),
            student_id=student.id,
            type="crystals_earned",
            description=description,
            stars_amount=None,
            crystals_amount=amount,
            created_at=datetime.now(UTC),
        )
    )


def _update_badge(student: StudentModel) -> str | None:
    """Обновляет уровень бейджа на основе суммарного количества звёзд.

    Сравнивает текущее количество звёзд с порогами BADGE_THRESHOLDS
    и устанавливает соответствующий уровень. Обновление происходит
    только при изменении уровня.

    Args:
        student: ORM-модель студента для обновления бейджа.

    Returns:
        str | None: Новый уровень бейджа при изменении, None если без изменений.
    """
    stars = student.stars or 0
    for threshold, level in BADGE_THRESHOLDS:
        if stars >= threshold:
            if student.badge_level != level:
                student.badge_level = level
                return level
            return None
    return None


async def _get_achievement_context(student_id: UUID, db: AsyncSession) -> dict:
    """Собирает статистику студента для проверки триггеров достижений.

    Загружает из БД агрегированные показатели:
    - Общее количество оценок и десяток.
    - Текущий GPA.
    - Серию посещений подряд (present/late).
    - Количество своевременно сданных домашек.

    Args:
        student_id: UUID студента.
        db: Асинхронная сессия SQLAlchemy.

    Returns:
        dict: Контекст с ключами: total_grades, tens_count, gpa,
            streak_present, hw_on_time.
    """
    total_grades = (
        await db.execute(select(func.count()).where(GradeRecordModel.student_id == student_id))
    ).scalar() or 0

    tens_count = (
        await db.execute(
            select(func.count()).where(
                GradeRecordModel.student_id == student_id,
                GradeRecordModel.score >= 10,
            )
        )
    ).scalar() or 0

    student = await db.get(StudentModel, student_id)
    gpa = float(student.gpa) if student and student.gpa else 0

    # Attendance streak (consecutive present, no absent)
    att_rows = (
        (
            await db.execute(
                select(AttendanceRecordModel.status)
                .where(AttendanceRecordModel.student_id == student_id)
                .order_by(AttendanceRecordModel.recorded_at.desc().nullslast())
            )
        )
        .scalars()
        .all()
    )

    streak = 0
    for status in att_rows:
        if status in ("present", "late"):
            streak += 1
        else:
            break

    # Homework on time
    hw_on_time = (
        await db.execute(
            select(func.count()).where(
                HomeworkSubmissionModel.student_id == student_id,
                HomeworkSubmissionModel.status.in_(["submitted", "graded"]),
            )
        )
    ).scalar() or 0

    return {
        "total_grades": total_grades,
        "tens_count": tens_count,
        "gpa": gpa,
        "streak_present": streak,
        "hw_on_time": hw_on_time,
    }


async def _check_achievements(student: StudentModel, db: AsyncSession) -> None:
    """Проверяет все триггерные достижения и разблокирует выполненные.

    Загружает контекст студента, все активные достижения с триггерами
    и список уже разблокированных. Для каждого нераблокированного
    достижения проверяет условие триггера и при выполнении:
    - Создаёт запись разблокировки.
    - Начисляет бонусные звёзды/кристаллы.
    - Добавляет событие в ленту активности.

    Args:
        student: ORM-модель студента для проверки.
        db: Асинхронная сессия SQLAlchemy.
    """
    ctx = await _get_achievement_context(student.id, db)

    # Get all active achievements with triggers
    achievements = (
        (
            await db.execute(
                select(AchievementModel).where(
                    AchievementModel.is_active == True,  # noqa: E712
                    AchievementModel.trigger_type != None,  # noqa: E711
                )
            )
        )
        .scalars()
        .all()
    )

    # Get already unlocked
    unlocked_ids = set(
        (
            await db.execute(
                select(StudentAchievementModel.achievement_id).where(StudentAchievementModel.student_id == student.id)
            )
        )
        .scalars()
        .all()
    )

    now = datetime.now(UTC)

    for ach in achievements:
        if ach.id in unlocked_ids:
            continue

        checker = TRIGGER_CHECKS.get(ach.trigger_type)
        if checker and checker(ctx):
            # Unlock!
            db.add(
                StudentAchievementModel(
                    id=uuid4(),
                    student_id=student.id,
                    achievement_id=ach.id,
                    unlocked_at=now,
                )
            )

            if ach.reward_stars > 0:
                student.stars = (student.stars or 0) + ach.reward_stars
            if ach.reward_crystals > 0:
                student.crystals = (student.crystals or 0) + ach.reward_crystals

            db.add(
                StudentActivityEventModel(
                    id=uuid4(),
                    student_id=student.id,
                    type="badge_unlocked",
                    description=f"Достижение: {ach.name}",
                    stars_amount=ach.reward_stars or None,
                    crystals_amount=ach.reward_crystals or None,
                    created_at=now,
                )
            )


# ── Public API ───────────────────────────────────────────────────────────────


async def on_lesson_conducted(
    student_id: UUID,
    attendance_status: str,
    grade: float | None,
    lesson_id: UUID,
    subject_id: UUID | None,
    lesson_topic: str | None,
    db: AsyncSession,
) -> None:
    """Обработчик проведения урока — начисление наград за посещаемость и оценку.

    Вызывается из conduct_lesson для каждого студента урока.
    Выполняет:
    1. Начисление звёзд за посещаемость (+5 present, -2 late).
    2. Начисление звёзд за оценку (+10 за 9-10, +5 за 7-8).
    3. Проверку серии посещений для начисления кристаллов
       (+5 за 5 подряд, +15 за 10 подряд).
    4. Обновление уровня бейджа.
    5. Проверку триггеров автоматических достижений.

    Args:
        student_id: UUID студента.
        attendance_status: Статус посещаемости ("present", "absent", "late", "excused").
        grade: Оценка за урок (0-10) или None если не выставлена.
        lesson_id: UUID урока.
        subject_id: UUID предмета (для привязки событий).
        lesson_topic: Тема урока (для описания события).
        db: Асинхронная сессия SQLAlchemy.

    Example:
        >>> await on_lesson_conducted(
        ...     student_id=uuid4(),
        ...     attendance_status="present",
        ...     grade=9.0,
        ...     lesson_id=uuid4(),
        ...     subject_id=uuid4(),
        ...     lesson_topic="Функции Python",
        ...     db=session,
        ... )
    """
    student = await db.get(StudentModel, student_id)
    if not student:
        return

    topic = lesson_topic or "урок"

    # Stars for attendance
    if attendance_status == "present":
        await _add_stars(student, STARS_ATTENDANCE_PRESENT, f"Посещение: {topic}", db, subject_id, lesson_id)
    elif attendance_status == "late":
        await _add_stars(student, STARS_ATTENDANCE_LATE, f"Опоздание: {topic}", db, subject_id, lesson_id)

    # Stars for grade
    if grade is not None:
        if grade >= 9:
            await _add_stars(
                student, STARS_GRADE_EXCELLENT, f"Оценка {grade}/10 за «{topic}»", db, subject_id, lesson_id
            )
        elif grade >= 7:
            await _add_stars(student, STARS_GRADE_GOOD, f"Оценка {grade}/10 за «{topic}»", db, subject_id, lesson_id)

    # Check attendance streak for crystals
    att_rows = (
        (
            await db.execute(
                select(AttendanceRecordModel.status)
                .where(AttendanceRecordModel.student_id == student_id)
                .order_by(AttendanceRecordModel.recorded_at.desc().nullslast())
            )
        )
        .scalars()
        .all()
    )

    streak = 0
    for s in att_rows:
        if s in ("present", "late"):
            streak += 1
        else:
            break

    if streak == 5:
        await _add_crystals(student, 5, "Серия: 5 уроков подряд!", db)
    elif streak == 10:
        await _add_crystals(student, 15, "Серия: 10 уроков подряд!", db)

    _update_badge(student)
    await _check_achievements(student, db)


async def on_homework_submitted(
    student_id: UUID,
    on_time: bool,
    db: AsyncSession,
) -> None:
    """Обработчик сдачи домашнего задания — начисление за своевременность.

    Вызывается при сдаче домашнего задания студентом. Начисляет
    звёзды только за своевременную сдачу (до дедлайна).

    Args:
        student_id: UUID студента.
        on_time: True если сдано до дедлайна, False если просрочено.
        db: Асинхронная сессия SQLAlchemy.
    """
    if not on_time:
        return

    student = await db.get(StudentModel, student_id)
    if not student:
        return

    await _add_stars(student, STARS_HOMEWORK_ON_TIME, "Домашка сдана вовремя", db)

    _update_badge(student)
    await _check_achievements(student, db)


async def on_homework_graded(
    student_id: UUID,
    score: float,
    max_score: float,
    db: AsyncSession,
) -> None:
    """Обработчик проверки домашнего задания — начисление за оценку.

    Нормализует оценку к 10-балльной шкале и начисляет звёзды
    за хорошую (7-8) или отличную (9-10) нормализованную оценку.

    Args:
        student_id: UUID студента.
        score: Набранный балл за домашку.
        max_score: Максимально возможный балл.
        db: Асинхронная сессия SQLAlchemy.

    Example:
        >>> await on_homework_graded(
        ...     student_id=uuid4(),
        ...     score=9.5,
        ...     max_score=10.0,
        ...     db=session,
        ... )
    """
    student = await db.get(StudentModel, student_id)
    if not student:
        return

    normalized = (score / max_score * 10) if max_score > 0 else 0

    if normalized >= 9:
        await _add_stars(student, STARS_HOMEWORK_GRADE_EXCELLENT, f"Отлично за домашку ({score}/{max_score})", db)
    elif normalized >= 7:
        await _add_stars(student, STARS_HOMEWORK_GRADE_GOOD, f"Хорошо за домашку ({score}/{max_score})", db)

    _update_badge(student)
    await _check_achievements(student, db)


async def on_diamonds_awarded(
    student_id: UUID,
    amount: int,
    reason: str,
    awarded_by: UUID,
    lesson_id: UUID,
    db: AsyncSession,
) -> None:
    """Обработчик ручного начисления бриллиантов преподавателем.

    Вызывается из conduct_lesson при наличии записей DiamondIn.
    Начисляет кристаллы на баланс студента и создаёт событие
    в ленте активности.

    Args:
        student_id: UUID студента.
        amount: Количество бриллиантов для начисления.
        reason: Причина начисления.
        awarded_by: UUID преподавателя, начислившего бриллианты.
        lesson_id: UUID урока, на котором произошло начисление.
        db: Асинхронная сессия SQLAlchemy.
    """
    student = await db.get(StudentModel, student_id)
    if not student:
        return

    student.crystals = (student.crystals or 0) + amount
    db.add(
        StudentActivityEventModel(
            id=uuid4(),
            student_id=student.id,
            type="crystals_earned",
            description=f"Бриллианты от преподавателя: {reason}",
            stars_amount=None,
            crystals_amount=amount,
            linked_lesson_id=lesson_id,
            created_at=datetime.now(UTC),
        )
    )
