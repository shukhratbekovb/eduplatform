"""Асинхронное извлечение признаков из базы данных для ML-модели оценки риска отчисления.

Модуль реализует класс ``RiskFeatureExtractor``, который извлекает 14 числовых
признаков для каждого студента из четырёх доменов: посещаемость, оценки,
домашние задания и платежи. Все признаки нормализованы в диапазон [0, 1]
для совместимости со sklearn-пайплайном.

Поддерживается как поштучное извлечение (для событийного пересчёта после
conduct-урока), так и пакетное (для ночного batch-пересчёта всех студентов).

Признаки (14 штук):
    Посещаемость (4):
        - attendance_rate_14d — доля присутствий за последние 14 дней
        - attendance_rate_30d — доля присутствий за последние 30 дней
        - absence_streak — серия пропусков подряд (нормализовано /10)
        - late_ratio_14d — доля опозданий за 14 дней

    Оценки (4):
        - gpa_overall — средний балл (нормализован 0–1)
        - avg_grade_last5 — средний балл последних 5 оценок
        - grade_trend — тренд оценок (наклон линейной регрессии, 0.5 = стабильно)
        - exam_fail_rate — доля проваленных экзаменов (< 40%)

    Домашние задания (3):
        - homework_completion_rate — доля выполненных ДЗ
        - overdue_rate — доля просроченных ДЗ
        - missed_homework_streak — серия пропущенных ДЗ подряд (/10)

    Платежи (3):
        - has_overdue_payment — наличие просроченного платежа (0 или 1)
        - max_debt_days — макс. дней просрочки (нормализовано /90)
        - overdue_payment_count — кол-во просроченных платежей (/5)
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infrastructure.persistence.models.lms import (
    AttendanceRecordModel,
    GradeRecordModel,
    HomeworkAssignmentModel,
    HomeworkSubmissionModel,
    LessonModel,
    PaymentModel,
)

FEATURE_NAMES = [
    "attendance_rate_14d",
    "attendance_rate_30d",
    "absence_streak",
    "late_ratio_14d",
    "gpa_overall",
    "avg_grade_last5",
    "grade_trend",
    "exam_fail_rate",
    "homework_completion_rate",
    "overdue_rate",
    "missed_homework_streak",
    "has_overdue_payment",
    "max_debt_days",
    "overdue_payment_count",
]


def _default_features() -> dict[str, float]:
    """Возвращает безопасные значения по умолчанию для студента без данных.

    Студент без истории активности считается низкорисковым: максимальная
    посещаемость, максимальный GPA, отсутствие долгов и пропусков.
    Это предотвращает ложноположительные срабатывания для новых студентов.

    Returns:
        Словарь из 14 признаков с дефолтными значениями, соответствующими
        низкому уровню риска.
    """
    return {
        "attendance_rate_14d": 1.0,
        "attendance_rate_30d": 1.0,
        "absence_streak": 0.0,
        "late_ratio_14d": 0.0,
        "gpa_overall": 1.0,
        "avg_grade_last5": 1.0,
        "grade_trend": 0.5,
        "exam_fail_rate": 0.0,
        "homework_completion_rate": 1.0,
        "overdue_rate": 0.0,
        "missed_homework_streak": 0.0,
        "has_overdue_payment": 0.0,
        "max_debt_days": 0.0,
        "overdue_payment_count": 0.0,
    }


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Ограничивает значение в заданном диапазоне.

    Используется для нормализации признаков в интервал [0, 1],
    гарантируя корректный ввод для sklearn-модели.

    Args:
        v: Исходное числовое значение.
        lo: Нижняя граница диапазона (по умолчанию 0.0).
        hi: Верхняя граница диапазона (по умолчанию 1.0).

    Returns:
        Значение, ограниченное диапазоном [lo, hi].
    """
    return max(lo, min(hi, v))


class RiskFeatureExtractor:
    """Извлекает ML-признаки для студентов из базы данных.

    Класс выполняет асинхронные SQL-запросы к PostgreSQL для извлечения
    14 числовых признаков из четырёх доменов: посещаемость, оценки,
    домашние задания и платежи. Поддерживает как поштучное, так и
    пакетное извлечение с использованием bulk-запросов для оптимизации.

    Attributes:
        _s: Асинхронная сессия SQLAlchemy для выполнения запросов.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Инициализирует экстрактор признаков.

        Args:
            session: Асинхронная сессия SQLAlchemy для доступа к БД.
        """
        self._s = session

    async def extract(self, student_id: UUID) -> dict[str, float]:
        """Извлекает все 14 признаков для одного студента.

        Выполняет последовательные запросы к четырём доменам данных
        и объединяет результаты в единый словарь признаков. Если для
        какого-либо домена нет данных, используются значения по умолчанию.

        Args:
            student_id: UUID студента в базе данных.

        Returns:
            Словарь {имя_признака: значение}, где все значения
            нормализованы в диапазон [0, 1].
        """
        features = _default_features()
        att = await self._extract_attendance(student_id)
        features.update(att)
        grades = await self._extract_grades(student_id)
        features.update(grades)
        hw = await self._extract_homework(student_id)
        features.update(hw)
        pay = await self._extract_payments(student_id)
        features.update(pay)
        return features

    async def extract_batch(self, student_ids: list[UUID]) -> dict[UUID, dict[str, float]]:
        """Пакетное извлечение признаков для множества студентов.

        Использует bulk SQL-запросы с группировкой по student_id вместо
        N отдельных запросов. Значительно эффективнее поштучного извлечения
        при ночном пересчёте всех студентов (~200 студентов = 4 запроса
        вместо 800).

        Args:
            student_ids: Список UUID студентов для обработки.

        Returns:
            Словарь {student_id: {имя_признака: значение}} для каждого
            студента. Студенты без данных получают дефолтные значения.
        """
        if not student_ids:
            return {}

        result: dict[UUID, dict[str, float]] = {sid: _default_features() for sid in student_ids}

        att_batch = await self._extract_attendance_batch(student_ids)
        for sid, att in att_batch.items():
            result[sid].update(att)

        grades_batch = await self._extract_grades_batch(student_ids)
        for sid, grades in grades_batch.items():
            result[sid].update(grades)

        hw_batch = await self._extract_homework_batch(student_ids)
        for sid, hw in hw_batch.items():
            result[sid].update(hw)

        pay_batch = await self._extract_payments_batch(student_ids)
        for sid, pay in pay_batch.items():
            result[sid].update(pay)

        return result

    # ── Attendance ────────────────────────────────────────────────────────────

    async def _extract_attendance(self, student_id: UUID) -> dict[str, float]:
        """Извлекает признаки посещаемости для одного студента.

        Анализирует записи посещаемости за последние 14 и 30 дней,
        а также вычисляет текущую серию пропусков подряд.

        Args:
            student_id: UUID студента.

        Returns:
            Словарь с 4 признаками посещаемости. Пустой словарь,
            если у студента нет записей посещаемости.
        """
        now = datetime.now(UTC)
        d14 = now - timedelta(days=14)
        d30 = now - timedelta(days=30)

        # Get attendance records with lesson dates
        rows = (
            await self._s.execute(
                select(
                    AttendanceRecordModel.status,
                    LessonModel.scheduled_at,
                )
                .join(LessonModel, AttendanceRecordModel.lesson_id == LessonModel.id)
                .where(
                    AttendanceRecordModel.student_id == student_id,
                    LessonModel.status == "completed",
                )
                .order_by(LessonModel.scheduled_at.desc())
            )
        ).all()

        if not rows:
            return {}

        total_14 = sum(1 for r in rows if r.scheduled_at and r.scheduled_at >= d14)
        present_14 = sum(
            1 for r in rows if r.scheduled_at and r.scheduled_at >= d14 and r.status in ("present", "late")
        )
        late_14 = sum(1 for r in rows if r.scheduled_at and r.scheduled_at >= d14 and r.status == "late")

        total_30 = sum(1 for r in rows if r.scheduled_at and r.scheduled_at >= d30)
        present_30 = sum(
            1 for r in rows if r.scheduled_at and r.scheduled_at >= d30 and r.status in ("present", "late")
        )

        # Absence streak: count consecutive absences from most recent
        streak = 0
        for r in rows:  # ordered by scheduled_at DESC
            if r.status == "absent":
                streak += 1
            else:
                break

        return {
            "attendance_rate_14d": _clamp(present_14 / total_14) if total_14 > 0 else 1.0,
            "attendance_rate_30d": _clamp(present_30 / total_30) if total_30 > 0 else 1.0,
            "absence_streak": _clamp(streak / 10.0),
            "late_ratio_14d": _clamp(late_14 / total_14) if total_14 > 0 else 0.0,
        }

    async def _extract_attendance_batch(self, student_ids: list[UUID]) -> dict[UUID, dict[str, float]]:
        """Пакетное извлечение признаков посещаемости для множества студентов.

        Выполняет один SQL-запрос с фильтром IN по student_id и затем
        группирует результаты на стороне Python. Вычисляет те же 4 признака,
        что и ``_extract_attendance``, но для всех студентов разом.

        Args:
            student_ids: Список UUID студентов.

        Returns:
            Словарь {student_id: {признак: значение}} для студентов,
            у которых есть данные о посещаемости.
        """
        now = datetime.now(UTC)
        d14 = now - timedelta(days=14)
        d30 = now - timedelta(days=30)

        rows = (
            await self._s.execute(
                select(
                    AttendanceRecordModel.student_id,
                    AttendanceRecordModel.status,
                    LessonModel.scheduled_at,
                )
                .join(LessonModel, AttendanceRecordModel.lesson_id == LessonModel.id)
                .where(
                    AttendanceRecordModel.student_id.in_(student_ids),
                    LessonModel.status == "completed",
                )
                .order_by(AttendanceRecordModel.student_id, LessonModel.scheduled_at.desc())
            )
        ).all()

        # Group by student
        from collections import defaultdict

        by_student: dict[UUID, list] = defaultdict(list)
        for r in rows:
            by_student[r.student_id].append(r)

        result: dict[UUID, dict[str, float]] = {}
        for sid in student_ids:
            student_rows = by_student.get(sid, [])
            if not student_rows:
                continue

            total_14 = sum(1 for r in student_rows if r.scheduled_at and r.scheduled_at >= d14)
            present_14 = sum(
                1 for r in student_rows if r.scheduled_at and r.scheduled_at >= d14 and r.status in ("present", "late")
            )
            late_14 = sum(1 for r in student_rows if r.scheduled_at and r.scheduled_at >= d14 and r.status == "late")
            total_30 = sum(1 for r in student_rows if r.scheduled_at and r.scheduled_at >= d30)
            present_30 = sum(
                1 for r in student_rows if r.scheduled_at and r.scheduled_at >= d30 and r.status in ("present", "late")
            )

            streak = 0
            for r in student_rows:
                if r.status == "absent":
                    streak += 1
                else:
                    break

            result[sid] = {
                "attendance_rate_14d": _clamp(present_14 / total_14) if total_14 > 0 else 1.0,
                "attendance_rate_30d": _clamp(present_30 / total_30) if total_30 > 0 else 1.0,
                "absence_streak": _clamp(streak / 10.0),
                "late_ratio_14d": _clamp(late_14 / total_14) if total_14 > 0 else 0.0,
            }

        return result

    # ── Grades ────────────────────────────────────────────────────────────────

    async def _extract_grades(self, student_id: UUID) -> dict[str, float]:
        """Извлекает признаки оценок для одного студента.

        Загружает все записи оценок из таблицы grade_records и вычисляет
        GPA, средний балл последних 5 оценок, тренд и долю проваленных экзаменов.

        Args:
            student_id: UUID студента.

        Returns:
            Словарь с 4 признаками оценок. Пустой словарь,
            если у студента нет оценок.
        """
        rows = (
            await self._s.execute(
                select(
                    GradeRecordModel.score,
                    GradeRecordModel.max_score,
                    GradeRecordModel.type,
                    GradeRecordModel.graded_at,
                )
                .where(GradeRecordModel.student_id == student_id)
                .order_by(GradeRecordModel.graded_at.desc())
            )
        ).all()

        if not rows:
            return {}

        return self._compute_grade_features(rows)

    async def _extract_grades_batch(self, student_ids: list[UUID]) -> dict[UUID, dict[str, float]]:
        """Пакетное извлечение признаков оценок для множества студентов.

        Один SQL-запрос загружает все оценки указанных студентов,
        затем результаты группируются и обрабатываются на стороне Python.

        Args:
            student_ids: Список UUID студентов.

        Returns:
            Словарь {student_id: {признак: значение}} для студентов
            с хотя бы одной оценкой.
        """
        rows = (
            await self._s.execute(
                select(
                    GradeRecordModel.student_id,
                    GradeRecordModel.score,
                    GradeRecordModel.max_score,
                    GradeRecordModel.type,
                    GradeRecordModel.graded_at,
                )
                .where(GradeRecordModel.student_id.in_(student_ids))
                .order_by(GradeRecordModel.student_id, GradeRecordModel.graded_at.desc())
            )
        ).all()

        from collections import defaultdict

        by_student: dict[UUID, list] = defaultdict(list)
        for r in rows:
            by_student[r.student_id].append(r)

        result: dict[UUID, dict[str, float]] = {}
        for sid in student_ids:
            student_rows = by_student.get(sid, [])
            if student_rows:
                result[sid] = self._compute_grade_features(student_rows)

        return result

    @staticmethod
    def _compute_grade_features(rows: list) -> dict[str, float]:
        """Вычисляет 4 признака из списка записей оценок.

        Логика вычисления:
            - **gpa_overall**: среднее нормализованных оценок (score/max_score),
              приведённое к диапазону [0, 1].
            - **avg_grade_last5**: среднее последних 5 нормализованных оценок.
            - **grade_trend**: наклон линейной регрессии по последним 10 оценкам.
              Значение 0.5 — стабильно, >0.5 — рост, <0.5 — снижение.
              Маппинг: slope * 5 + 0.5, затем clamp в [0, 1].
            - **exam_fail_rate**: доля проваленных экзаменов (< 40% от max_score).

        Args:
            rows: Список записей оценок (score, max_score, type, graded_at),
                отсортированных по graded_at DESC.

        Returns:
            Словарь с 4 признаками оценок, нормализованными в [0, 1].
        """
        # GPA overall (normalized to 0-1 for ML)
        normalized = []
        for r in rows:
            ms = float(r.max_score) if r.max_score and float(r.max_score) > 0 else 10.0
            normalized.append(float(r.score) / ms)

        gpa = sum(normalized) / len(normalized) if normalized else 1.0

        # Last 5 grades
        last5 = normalized[:5]
        avg_last5 = sum(last5) / len(last5) if last5 else gpa

        # Grade trend: slope of last 10 grades (reversed so oldest first)
        last10 = list(reversed(normalized[:10]))
        if len(last10) >= 3:
            n = len(last10)
            x_mean = (n - 1) / 2.0
            y_mean = sum(last10) / n
            num = sum((i - x_mean) * (y - y_mean) for i, y in enumerate(last10))
            den = sum((i - x_mean) ** 2 for i in range(n))
            slope = num / den if den > 0 else 0.0
            # Normalize slope: map [-0.1, +0.1] → [0, 1], centered at 0.5
            grade_trend = _clamp(slope * 5 + 0.5)
        else:
            grade_trend = 0.5

        # Exam fail rate
        exams = [r for r in rows if r.type == "exam"]
        if exams:
            fails = sum(
                1
                for r in exams
                if float(r.score) / (float(r.max_score) if r.max_score and float(r.max_score) > 0 else 10.0) < 0.4
            )
            exam_fail = fails / len(exams)
        else:
            exam_fail = 0.0

        return {
            "gpa_overall": _clamp(gpa),
            "avg_grade_last5": _clamp(avg_last5),
            "grade_trend": grade_trend,
            "exam_fail_rate": _clamp(exam_fail),
        }

    # ── Homework ──────────────────────────────────────────────────────────────

    async def _extract_homework(self, student_id: UUID) -> dict[str, float]:
        """Извлекает признаки домашних заданий для одного студента.

        Загружает все записи submissions студента с JOIN на assignments
        для получения due_date. Вычисляет completion rate, overdue rate
        и серию пропущенных ДЗ подряд.

        Args:
            student_id: UUID студента.

        Returns:
            Словарь с 3 признаками домашних заданий. Пустой словарь,
            если у студента нет submissions.
        """
        rows = (
            await self._s.execute(
                select(
                    HomeworkSubmissionModel.status,
                    HomeworkAssignmentModel.due_date,
                )
                .join(HomeworkAssignmentModel, HomeworkSubmissionModel.assignment_id == HomeworkAssignmentModel.id)
                .where(HomeworkSubmissionModel.student_id == student_id)
                .order_by(HomeworkAssignmentModel.due_date.desc())
            )
        ).all()

        if not rows:
            return {}

        return self._compute_hw_features(rows)

    async def _extract_homework_batch(self, student_ids: list[UUID]) -> dict[UUID, dict[str, float]]:
        """Пакетное извлечение признаков домашних заданий для множества студентов.

        Args:
            student_ids: Список UUID студентов.

        Returns:
            Словарь {student_id: {признак: значение}} для студентов
            с хотя бы одним submission.
        """
        rows = (
            await self._s.execute(
                select(
                    HomeworkSubmissionModel.student_id,
                    HomeworkSubmissionModel.status,
                    HomeworkAssignmentModel.due_date,
                )
                .join(HomeworkAssignmentModel, HomeworkSubmissionModel.assignment_id == HomeworkAssignmentModel.id)
                .where(HomeworkSubmissionModel.student_id.in_(student_ids))
                .order_by(HomeworkSubmissionModel.student_id, HomeworkAssignmentModel.due_date.desc())
            )
        ).all()

        from collections import defaultdict

        by_student: dict[UUID, list] = defaultdict(list)
        for r in rows:
            by_student[r.student_id].append(r)

        result: dict[UUID, dict[str, float]] = {}
        for sid in student_ids:
            student_rows = by_student.get(sid, [])
            if student_rows:
                result[sid] = self._compute_hw_features(student_rows)

        return result

    @staticmethod
    def _compute_hw_features(rows: list) -> dict[str, float]:
        """Вычисляет 3 признака из списка записей домашних заданий.

        Логика:
            - **homework_completion_rate**: доля ДЗ со статусом submitted/graded.
            - **overdue_rate**: доля ДЗ со статусом overdue.
            - **missed_homework_streak**: серия последних подряд пропущенных/просроченных
              ДЗ (overdue или pending), нормализованная делением на 10.

        Args:
            rows: Список записей (status, due_date), отсортированных
                по due_date DESC.

        Returns:
            Словарь с 3 признаками домашних заданий.
        """
        total = len(rows)
        completed = sum(1 for r in rows if r.status in ("submitted", "graded"))
        overdue = sum(1 for r in rows if r.status == "overdue")

        # Missed streak: consecutive recent missed/overdue (ordered by due_date DESC)
        streak = 0
        for r in rows:
            if r.status in ("overdue", "pending"):
                streak += 1
            else:
                break

        return {
            "homework_completion_rate": _clamp(completed / total) if total > 0 else 1.0,
            "overdue_rate": _clamp(overdue / total) if total > 0 else 0.0,
            "missed_homework_streak": _clamp(streak / 10.0),
        }

    # ── Payments ──────────────────────────────────────────────────────────────

    async def _extract_payments(self, student_id: UUID) -> dict[str, float]:
        """Извлекает признаки платежей для одного студента.

        Загружает все записи из таблицы payments для данного студента
        и вычисляет наличие просрочки, максимальное количество дней
        просрочки и число просроченных платежей.

        Args:
            student_id: UUID студента.

        Returns:
            Словарь с 3 признаками платежей. Пустой словарь,
            если у студента нет платежей.
        """
        rows = (
            await self._s.execute(
                select(
                    PaymentModel.status,
                    PaymentModel.due_date,
                ).where(PaymentModel.student_id == student_id)
            )
        ).all()

        if not rows:
            return {}

        return self._compute_payment_features(rows)

    async def _extract_payments_batch(self, student_ids: list[UUID]) -> dict[UUID, dict[str, float]]:
        """Пакетное извлечение признаков платежей для множества студентов.

        Args:
            student_ids: Список UUID студентов.

        Returns:
            Словарь {student_id: {признак: значение}} для студентов
            с хотя бы одним платежом.
        """
        rows = (
            await self._s.execute(
                select(
                    PaymentModel.student_id,
                    PaymentModel.status,
                    PaymentModel.due_date,
                ).where(PaymentModel.student_id.in_(student_ids))
            )
        ).all()

        from collections import defaultdict

        by_student: dict[UUID, list] = defaultdict(list)
        for r in rows:
            by_student[r.student_id].append(r)

        result: dict[UUID, dict[str, float]] = {}
        for sid in student_ids:
            student_rows = by_student.get(sid, [])
            if student_rows:
                result[sid] = self._compute_payment_features(student_rows)

        return result

    @staticmethod
    def _compute_payment_features(rows: list) -> dict[str, float]:
        """Вычисляет 3 признака из списка записей платежей.

        Логика:
            - **has_overdue_payment**: бинарный признак (1.0 если есть хоть один
              просроченный платёж, иначе 0.0).
            - **max_debt_days**: максимальное кол-во дней просрочки среди всех
              просроченных платежей, нормализованное делением на 90 дней.
            - **overdue_payment_count**: кол-во просроченных платежей,
              нормализованное делением на 5.

        Args:
            rows: Список записей (status, due_date) из таблицы payments.

        Returns:
            Словарь с 3 признаками платежей, нормализованными в [0, 1].
        """
        from datetime import date as date_type

        today = date_type.today()
        overdue_rows = [r for r in rows if r.status == "overdue"]
        has_overdue = 1.0 if overdue_rows else 0.0

        max_debt_days = 0.0
        for r in overdue_rows:
            if r.due_date:
                days = (today - r.due_date).days
                if days > max_debt_days:
                    max_debt_days = days

        overdue_count = len(overdue_rows)

        return {
            "has_overdue_payment": has_overdue,
            "max_debt_days": _clamp(max_debt_days / 90.0),
            "overdue_payment_count": _clamp(overdue_count / 5.0),
        }
