"""Оркестратор ML-скоринга: извлечение признаков, предсказание, маппинг в уровни риска.

Модуль объединяет компоненты ML-пайплайна в единый интерфейс ``MLRiskScorer``,
который последовательно выполняет:
    1. Извлечение 14 признаков из БД (``RiskFeatureExtractor``).
    2. Предсказание вероятности отчисления (``RiskPredictor``).
    3. Маппинг вероятности в дискретный уровень риска (LOW/MEDIUM/HIGH/CRITICAL).
    4. Вычисление доменных суб-оценок (посещаемость, оценки, ДЗ, платежи).

Пороги уровней риска:
    - CRITICAL: >= 75% вероятность отчисления
    - HIGH: >= 50%
    - MEDIUM: >= 25%
    - LOW: < 25%

Доменные суб-оценки вычисляются как взвешенные суммы признаков с учётом
feature importances из обученной модели. Это позволяет понять, какой именно
домен вносит наибольший вклад в итоговый риск.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.lms.entities import RiskLevel
from src.infrastructure.persistence.models.lms import StudentModel
from src.ml.feature_extractor import RiskFeatureExtractor
from src.ml.predictor import RiskPredictor

# Probability → RiskLevel thresholds
RISK_THRESHOLDS = [
    (0.75, RiskLevel.CRITICAL),
    (0.50, RiskLevel.HIGH),
    (0.25, RiskLevel.MEDIUM),
]

# Feature → domain mapping
DOMAIN_FEATURES = {
    "attendance": [
        "attendance_rate_14d",
        "attendance_rate_30d",
        "absence_streak",
        "late_ratio_14d",
    ],
    "grades": [
        "gpa_overall",
        "avg_grade_last5",
        "grade_trend",
        "exam_fail_rate",
    ],
    "homework": [
        "homework_completion_rate",
        "overdue_rate",
        "missed_homework_streak",
    ],
    "payment": [
        "has_overdue_payment",
        "max_debt_days",
        "overdue_payment_count",
    ],
}

# Features where higher = worse (inverted for risk score)
_HIGHER_IS_WORSE = {
    "absence_streak",
    "late_ratio_14d",
    "exam_fail_rate",
    "overdue_rate",
    "missed_homework_streak",
    "has_overdue_payment",
    "max_debt_days",
    "overdue_payment_count",
}

# Features where higher = better (inverted to get risk)
_HIGHER_IS_BETTER = {
    "attendance_rate_14d",
    "attendance_rate_30d",
    "gpa_overall",
    "avg_grade_last5",
    "grade_trend",
    "homework_completion_rate",
}


@dataclass
class RiskScoreResult:
    """Результат ML-скоринга риска отчисления для одного студента.

    Содержит итоговый уровень риска, вероятность отчисления, доменные
    суб-оценки и детали для отображения в UI.

    Attributes:
        student_id: UUID студента.
        risk_level: Итоговый уровень риска (LOW/MEDIUM/HIGH/CRITICAL).
        dropout_probability: Вероятность отчисления от ML-модели [0, 1].
        attendance_score: Уровень риска по домену посещаемости.
        grades_score: Уровень риска по домену оценок.
        homework_score: Уровень риска по домену домашних заданий.
        payment_score: Уровень риска по домену платежей.
        details: Словарь с человекочитаемыми деталями для UI
            (attendancePercent14d, avgGradeLast5, missedHomeworkStreak,
            debtDays, dropoutProbability).
        computed_at: Временная метка вычисления (UTC).
    """

    student_id: UUID
    risk_level: RiskLevel
    dropout_probability: float
    attendance_score: RiskLevel
    grades_score: RiskLevel
    homework_score: RiskLevel
    payment_score: RiskLevel
    details: dict
    computed_at: datetime


def probability_to_risk_level(prob: float) -> RiskLevel:
    """Преобразует вероятность отчисления в дискретный уровень риска.

    Пороги (проверяются сверху вниз):
        - >= 0.75 -> CRITICAL
        - >= 0.50 -> HIGH
        - >= 0.25 -> MEDIUM
        - < 0.25 -> LOW

    Args:
        prob: Вероятность отчисления в диапазоне [0.0, 1.0].

    Returns:
        Соответствующий уровень риска из перечисления RiskLevel.
    """
    for threshold, level in RISK_THRESHOLDS:
        if prob >= threshold:
            return level
    return RiskLevel.LOW


def _domain_risk_score(features: dict[str, float], domain_features: list[str], importances: dict[str, float]) -> float:
    """Вычисляет взвешенную оценку риска для одного домена.

    Для каждого признака домена определяется его вклад в риск:
        - Признаки из ``_HIGHER_IS_BETTER`` (посещаемость, GPA): risk = 1 - value
        - Признаки из ``_HIGHER_IS_WORSE`` (пропуски, долги): risk = value

    Вклады взвешиваются по feature importances из обученной модели.

    Args:
        features: Полный словарь 14 признаков студента.
        domain_features: Список имён признаков данного домена.
        importances: Словарь {имя_признака: важность} из модели.

    Returns:
        Оценка риска домена в диапазоне [0, 1], где 0 — минимальный риск,
        1 — максимальный.
    """
    total_weight = 0.0
    weighted_sum = 0.0

    for fname in domain_features:
        val = features.get(fname, 0.0)
        weight = importances.get(fname, 1.0 / 14)

        if fname in _HIGHER_IS_BETTER:
            risk_val = 1.0 - val
        else:
            risk_val = val

        weighted_sum += risk_val * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0
    return weighted_sum / total_weight


class MLRiskScorer:
    """Оркестратор ML-скоринга: объединяет извлечение признаков и предсказание.

    Предоставляет два режима работы:
        - ``score_student`` — скоринг одного студента (для событийного триггера
          после conduct-урока или сдачи ДЗ).
        - ``score_all_active`` — пакетный скоринг всех активных студентов
          (для ночного Celery-задания).

    Attributes:
        _extractor: Экземпляр RiskFeatureExtractor для извлечения признаков.
        _predictor: Синглтон RiskPredictor для инференса модели.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Инициализирует оркестратор.

        Args:
            session: Асинхронная сессия SQLAlchemy для извлечения признаков.
        """
        self._extractor = RiskFeatureExtractor(session)
        self._predictor = RiskPredictor.get_instance()

    async def score_student(self, student_id: UUID) -> RiskScoreResult:
        """Выполняет ML-скоринг для одного студента.

        Последовательно извлекает признаки, получает предсказание модели
        и формирует результат с доменными суб-оценками.

        Args:
            student_id: UUID студента для скоринга.

        Returns:
            Объект RiskScoreResult с итоговым уровнем риска, вероятностью
            отчисления, доменными оценками и деталями.
        """
        features = await self._extractor.extract(student_id)
        prob = self._predictor.predict_proba(features)
        importances = self._predictor.feature_importances()

        return self._build_result(student_id, features, prob, importances)

    async def score_all_active(self, session: AsyncSession) -> list[RiskScoreResult]:
        """Пакетный ML-скоринг всех активных студентов.

        Загружает ID всех активных студентов, извлекает признаки bulk-запросами,
        выполняет пакетное предсказание и формирует результаты.

        Оптимизирован для ночного пересчёта: ~200 студентов обрабатываются
        за ~4 SQL-запроса + 1 вызов predict_batch.

        Args:
            session: Асинхронная сессия для загрузки списка студентов.

        Returns:
            Список RiskScoreResult для каждого активного студента.
            Пустой список, если нет активных студентов.
        """
        rows = (await session.execute(select(StudentModel.id).where(StudentModel.is_active.is_(True)))).scalars().all()

        student_ids = list(rows)
        if not student_ids:
            return []

        all_features = await self._extractor.extract_batch(student_ids)
        features_list = [all_features[sid] for sid in student_ids]
        probas = self._predictor.predict_batch(features_list)
        importances = self._predictor.feature_importances()

        results = []
        for sid, features, prob in zip(student_ids, features_list, probas, strict=False):
            results.append(self._build_result(sid, features, prob, importances))

        return results

    def _build_result(
        self,
        student_id: UUID,
        features: dict[str, float],
        prob: float,
        importances: dict[str, float],
    ) -> RiskScoreResult:
        """Формирует объект результата из сырых данных.

        Вычисляет доменные суб-оценки, маппит вероятность в уровень риска
        и создаёт словарь деталей для отображения в UI.

        Args:
            student_id: UUID студента.
            features: Словарь 14 извлечённых признаков.
            prob: Вероятность отчисления от модели.
            importances: Важности признаков для взвешивания суб-оценок.

        Returns:
            Заполненный объект RiskScoreResult.
        """
        risk_level = probability_to_risk_level(prob)

        att_score_val = _domain_risk_score(features, DOMAIN_FEATURES["attendance"], importances)
        grades_score_val = _domain_risk_score(features, DOMAIN_FEATURES["grades"], importances)
        hw_score_val = _domain_risk_score(features, DOMAIN_FEATURES["homework"], importances)
        pay_score_val = _domain_risk_score(features, DOMAIN_FEATURES["payment"], importances)

        details = {
            "attendancePercent14d": round(features.get("attendance_rate_14d", 1.0) * 100, 1),
            "avgGradeLast5": round(features.get("avg_grade_last5", 1.0) * 10, 1),
            "missedHomeworkStreak": int(features.get("missed_homework_streak", 0.0) * 10),
            "debtDays": int(features.get("max_debt_days", 0.0) * 90),
            "dropoutProbability": round(prob, 4),
        }

        return RiskScoreResult(
            student_id=student_id,
            risk_level=risk_level,
            dropout_probability=prob,
            attendance_score=probability_to_risk_level(att_score_val),
            grades_score=probability_to_risk_level(grades_score_val),
            homework_score=probability_to_risk_level(hw_score_val),
            payment_score=probability_to_risk_level(pay_score_val),
            details=details,
            computed_at=datetime.now(UTC),
        )
