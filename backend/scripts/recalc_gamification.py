#!/usr/bin/env python3
"""Пересчёт геймификации (звёзды, кристаллы, значки, достижения) для всех студентов.

Скрипт выполняет bulk-пересчёт геймификационных метрик на основе реальных
данных из таблиц attendance_records, grade_records и homework_submissions.
Использует те же правила начисления, что и gamification_engine.py, но
оптимизирован для массовой обработки.

Правила начисления звёзд:
    - Посещение (present): +5 звёзд
    - Опоздание (late): -2 звезды
    - Оценка >= 9/10: +10 звёзд
    - Оценка >= 7/10: +5 звёзд
    - Домашка сдана вовремя: +15 звёзд
    - Оценка за ДЗ >= 9: +20 звёзд
    - Оценка за ДЗ >= 7: +10 звёзд

Правила начисления кристаллов:
    - Серия посещений >= 5 подряд: +5 кристаллов
    - Серия посещений >= 10 подряд: +15 кристаллов

Значки (badge_level) по суммарным звёздам:
    - Bronze: 0+
    - Silver: 100+
    - Gold: 300+
    - Platinum: 600+
    - Diamond: 1000+

Достижения проверяются по триггерам:
    - first_grade: >= 1 оценка
    - five_tens: >= 5 оценок 10/10
    - gpa_9: GPA >= 9.0
    - ten_present: серия >= 10 присутствий
    - thirty_present: серия >= 30 присутствий
    - ten_homework: >= 10 сданных ДЗ

Запуск:
    .. code-block:: bash

        docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/recalc_gamification.py"
"""
import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import text, select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from src.config import settings
from src.database import async_session_factory
import src.infrastructure.persistence.models.auth  # noqa: F401 — register User model for FK resolution
from src.infrastructure.persistence.models.lms import (
    StudentModel, AttendanceRecordModel, GradeRecordModel,
    HomeworkSubmissionModel,
)
from src.infrastructure.persistence.models.gamification import (
    AchievementModel, StudentAchievementModel, StudentActivityEventModel,
)

# Same rules as gamification_engine.py
STARS_PRESENT = 5
STARS_LATE = -2
STARS_GRADE_EXCELLENT = 10   # score >= 9
STARS_GRADE_GOOD = 5         # score >= 7
STARS_HW_ON_TIME = 15
STARS_HW_GRADE_EXCELLENT = 20
STARS_HW_GRADE_GOOD = 10

BADGE_THRESHOLDS = [
    (1000, "diamond"), (600, "platinum"), (300, "gold"), (100, "silver"), (0, "bronze"),
]

TRIGGER_CHECKS = {
    "first_grade":    lambda ctx: ctx["total_grades"] >= 1,
    "five_tens":      lambda ctx: ctx["tens_count"] >= 5,
    "gpa_9":          lambda ctx: (ctx["gpa"] or 0) >= 9.0,
    "ten_present":    lambda ctx: ctx["streak"] >= 10,
    "thirty_present": lambda ctx: ctx["streak"] >= 30,
    "ten_homework":   lambda ctx: ctx["hw_on_time"] >= 10,
}


async def main() -> None:
    """Основная функция пересчёта геймификации.

    Последовательность действий:
        1. Очистка старых геймификационных данных (events, achievements, обнуление счётчиков).
        2. Загрузка всех активных студентов и достижений.
        3. Для каждого студента:
            a. Подсчёт звёзд из посещаемости (present * 5 + late * (-2)).
            b. Вычисление серии посещений и начисление кристаллов.
            c. Подсчёт звёзд из оценок (excellent + good).
            d. Подсчёт звёзд из домашних заданий.
            e. Обновление badge_level по суммарным звёздам.
            f. Проверка триггеров достижений и разблокировка.
        4. Сохранение всех изменений в БД.
        5. Вывод статистики (звёзды, кристаллы, events, достижения, распределение значков).
    """
    print("=== Recalculating gamification ===\n")

    async with async_session_factory() as db:
        # Clear old gamification data
        await db.execute(text("DELETE FROM student_activity_events"))
        await db.execute(text("DELETE FROM student_achievements"))
        await db.execute(text("UPDATE students SET stars = 0, crystals = 0, badge_level = 'bronze'"))
        await db.flush()

        students = (await db.execute(
            select(StudentModel).where(StudentModel.is_active.is_(True))
        )).scalars().all()
        print(f"  Processing {len(students)} students...")

        now = datetime.now(timezone.utc)
        achievements = (await db.execute(
            select(AchievementModel).where(
                AchievementModel.is_active.is_(True),
                AchievementModel.trigger_type.isnot(None),
            )
        )).scalars().all()

        stats = {"total_stars": 0, "total_crystals": 0, "events": 0, "achievements": 0}
        badge_dist = {}

        for student in students:
            stars = 0
            crystals = 0
            events: list[StudentActivityEventModel] = []

            # ── 1. Stars from attendance ──────────────────────────────────
            att_rows = (await db.execute(
                select(AttendanceRecordModel.status)
                .where(AttendanceRecordModel.student_id == student.id)
                .order_by(AttendanceRecordModel.recorded_at.desc().nullslast())
            )).scalars().all()

            present_count = sum(1 for s in att_rows if s == "present")
            late_count = sum(1 for s in att_rows if s == "late")
            att_stars = present_count * STARS_PRESENT + late_count * STARS_LATE
            stars += att_stars

            if att_stars != 0:
                events.append(StudentActivityEventModel(
                    id=uuid4(), student_id=student.id, type="stars_earned",
                    description=f"Посещение: {present_count} присутствий, {late_count} опозданий",
                    stars_amount=att_stars, created_at=now,
                ))

            # Attendance streak
            streak = 0
            for s in att_rows:
                if s in ("present", "late"):
                    streak += 1
                else:
                    break

            if streak >= 10:
                crystals += 15
                events.append(StudentActivityEventModel(
                    id=uuid4(), student_id=student.id, type="crystals_earned",
                    description=f"Серия: {streak} уроков подряд!",
                    crystals_amount=15, created_at=now,
                ))
            elif streak >= 5:
                crystals += 5
                events.append(StudentActivityEventModel(
                    id=uuid4(), student_id=student.id, type="crystals_earned",
                    description=f"Серия: {streak} уроков подряд!",
                    crystals_amount=5, created_at=now,
                ))

            # ── 2. Stars from grades ──────────────────────────────────────
            grade_rows = (await db.execute(
                select(GradeRecordModel.score, GradeRecordModel.max_score)
                .where(GradeRecordModel.student_id == student.id)
            )).all()

            excellent_count = 0
            good_count = 0
            tens_count = 0
            for g in grade_rows:
                ms = float(g.max_score) if g.max_score and float(g.max_score) > 0 else 10.0
                normalized = float(g.score) / ms * 10
                if normalized >= 9:
                    stars += STARS_GRADE_EXCELLENT
                    excellent_count += 1
                elif normalized >= 7:
                    stars += STARS_GRADE_GOOD
                    good_count += 1
                if float(g.score) >= 10 and float(g.max_score or 10) == 10:
                    tens_count += 1

            if excellent_count + good_count > 0:
                grade_stars = excellent_count * STARS_GRADE_EXCELLENT + good_count * STARS_GRADE_GOOD
                events.append(StudentActivityEventModel(
                    id=uuid4(), student_id=student.id, type="stars_earned",
                    description=f"Оценки: {excellent_count} отличных, {good_count} хороших",
                    stars_amount=grade_stars, created_at=now,
                ))

            # ── 3. Stars from homework ────────────────────────────────────
            hw_rows = (await db.execute(
                select(HomeworkSubmissionModel.status, HomeworkSubmissionModel.score)
                .where(HomeworkSubmissionModel.student_id == student.id)
            )).all()

            hw_on_time = sum(1 for h in hw_rows if h.status in ("submitted", "graded"))
            hw_stars = hw_on_time * STARS_HW_ON_TIME
            stars += hw_stars

            hw_excellent = sum(1 for h in hw_rows if h.score and float(h.score) >= 9)
            hw_good = sum(1 for h in hw_rows if h.score and 7 <= float(h.score) < 9)
            stars += hw_excellent * STARS_HW_GRADE_EXCELLENT + hw_good * STARS_HW_GRADE_GOOD

            if hw_stars > 0 or hw_excellent + hw_good > 0:
                total_hw_stars = hw_stars + hw_excellent * STARS_HW_GRADE_EXCELLENT + hw_good * STARS_HW_GRADE_GOOD
                events.append(StudentActivityEventModel(
                    id=uuid4(), student_id=student.id, type="stars_earned",
                    description=f"Домашки: {hw_on_time} сдано, {hw_excellent} отлично",
                    stars_amount=total_hw_stars, created_at=now,
                ))

            # ── 4. Update student ─────────────────────────────────────────
            stars = max(0, stars)
            student.stars = stars
            student.crystals = crystals

            # Badge
            for threshold, level in BADGE_THRESHOLDS:
                if stars >= threshold:
                    student.badge_level = level
                    break

            badge_dist[student.badge_level] = badge_dist.get(student.badge_level, 0) + 1

            # Activity events
            for ev in events:
                db.add(ev)
            stats["events"] += len(events)
            stats["total_stars"] += stars
            stats["total_crystals"] += crystals

            # ── 5. Achievements ───────────────────────────────────────────
            gpa = float(student.gpa) if student.gpa else 0
            ctx = {
                "total_grades": len(grade_rows),
                "tens_count": tens_count,
                "gpa": gpa,
                "streak": streak,
                "hw_on_time": hw_on_time,
            }

            for ach in achievements:
                checker = TRIGGER_CHECKS.get(ach.trigger_type)
                if checker and checker(ctx):
                    db.add(StudentAchievementModel(
                        id=uuid4(), student_id=student.id,
                        achievement_id=ach.id, unlocked_at=now,
                    ))
                    student.stars += (ach.reward_stars or 0)
                    student.crystals += (ach.reward_crystals or 0)
                    stats["achievements"] += 1

                    if ach.reward_stars or ach.reward_crystals:
                        db.add(StudentActivityEventModel(
                            id=uuid4(), student_id=student.id,
                            type="badge_unlocked",
                            description=f"Достижение: {ach.name}",
                            stars_amount=ach.reward_stars or None,
                            crystals_amount=ach.reward_crystals or None,
                            created_at=now,
                        ))
                        stats["events"] += 1

        await db.commit()

    print(f"  Stars total: {stats['total_stars']}")
    print(f"  Crystals total: {stats['total_crystals']}")
    print(f"  Activity events: {stats['events']}")
    print(f"  Achievements unlocked: {stats['achievements']}")
    print(f"  Badge distribution: {badge_dist}")
    print("\n  Done!")


if __name__ == "__main__":
    asyncio.run(main())
