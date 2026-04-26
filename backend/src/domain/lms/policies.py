"""Политики домена LMS — бизнес-правила с пороговыми значениями и вычислениями.

Этот модуль содержит доменные политики подсистемы LMS, определяющие
бизнес-правила для расчёта уровня риска отчисления студента
и определения просроченных платежей.

Классы:
    RiskCalculationPolicy: Политика расчёта уровня риска (ML + fallback).
    PaymentOverduePolicy: Политика определения просроченных платежей.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.domain.lms.entities import Payment

from src.domain.lms.entities import RiskLevel, PaymentStatus


class RiskCalculationPolicy:
    """Политика расчёта уровня риска отчисления студента.

    Поддерживает два режима расчёта:

    1. **ML-модель** (основной): принимает вероятность отчисления (0.0-1.0)
       от MLRiskScorer и маппит её в дискретный RiskLevel.
    2. **Пороговые значения** (fallback): используется при недоступности
       ML-модели, определяет риск на основе посещаемости и GPA.

    Attributes:
        CRITICAL_THRESHOLD: Порог вероятности для критического риска (>= 0.75).
        HIGH_THRESHOLD: Порог вероятности для высокого риска (>= 0.50).
        MEDIUM_THRESHOLD: Порог вероятности для среднего риска (>= 0.25).
        ATT_HIGH_THRESHOLD: Порог посещаемости для высокого риска (< 50%).
        ATT_MEDIUM_THRESHOLD: Порог посещаемости для среднего риска (< 70%).
        GPA_HIGH_THRESHOLD: Порог GPA для высокого риска (< 4.0).
        GPA_MEDIUM_THRESHOLD: Порог GPA для среднего риска (< 6.0).

    Example:
        >>> RiskCalculationPolicy.from_probability(0.8)
        <RiskLevel.CRITICAL: 'critical'>
        >>> RiskCalculationPolicy.calculate(
        ...     attendance_percent=Decimal("45"),
        ...     gpa=Decimal("5.0"),
        ... )
        <RiskLevel.HIGH: 'high'>
    """

    # Пороги вероятности ML-модели
    CRITICAL_THRESHOLD = Decimal("0.75")
    HIGH_THRESHOLD = Decimal("0.50")
    MEDIUM_THRESHOLD = Decimal("0.25")

    # Пороги fallback-логики (посещаемость и GPA)
    ATT_HIGH_THRESHOLD = Decimal("50")
    ATT_MEDIUM_THRESHOLD = Decimal("70")
    GPA_HIGH_THRESHOLD = Decimal("4")
    GPA_MEDIUM_THRESHOLD = Decimal("6")

    @classmethod
    def from_probability(cls, probability: float) -> RiskLevel:
        """Определяет уровень риска по вероятности отчисления от ML-модели.

        Маппинг вероятности в дискретный уровень:
            - >= 0.75 -> CRITICAL
            - >= 0.50 -> HIGH
            - >= 0.25 -> MEDIUM
            - < 0.25  -> LOW

        Args:
            probability: Вероятность отчисления от ML-модели (0.0 — 1.0).

        Returns:
            RiskLevel: Дискретный уровень риска отчисления.
        """
        p = Decimal(str(probability))
        if p >= cls.CRITICAL_THRESHOLD:
            return RiskLevel.CRITICAL
        if p >= cls.HIGH_THRESHOLD:
            return RiskLevel.HIGH
        if p >= cls.MEDIUM_THRESHOLD:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    @classmethod
    def calculate(
        cls,
        attendance_percent: Decimal | None,
        gpa: Decimal | None,
    ) -> RiskLevel:
        """Рассчитывает уровень риска по пороговым значениям (fallback).

        Используется, когда ML-модель недоступна. Определяет риск
        на основе текущей посещаемости и среднего балла.

        Логика:
            - Если посещаемость < 50% ИЛИ GPA < 4.0 -> HIGH
            - Если посещаемость < 70% ИЛИ GPA < 6.0 -> MEDIUM
            - Иначе -> LOW

        Args:
            attendance_percent: Процент посещаемости (0-100).
                None интерпретируется как 100% (нет данных = нет проблем).
            gpa: Средний балл по 10-балльной шкале.
                None интерпретируется как 12 (максимальный, нет данных).

        Returns:
            RiskLevel: Дискретный уровень риска отчисления.
        """
        att = attendance_percent if attendance_percent is not None else Decimal("100")
        g = gpa if gpa is not None else Decimal("12")

        if att < cls.ATT_HIGH_THRESHOLD or g < cls.GPA_HIGH_THRESHOLD:
            return RiskLevel.HIGH
        if att < cls.ATT_MEDIUM_THRESHOLD or g < cls.GPA_MEDIUM_THRESHOLD:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW


class PaymentOverduePolicy:
    """Политика определения просроченных платежей.

    Определяет, должен ли платёж быть переведён в статус OVERDUE
    на основании его текущего статуса и крайнего срока оплаты.
    Применяется автоматически при запросе списка платежей.
    """

    @staticmethod
    def is_overdue(payment: Payment) -> bool:
        """Проверяет, является ли платёж просроченным.

        Платёж считается просроченным, если одновременно выполняются
        три условия:
            1. Текущий статус — PENDING (ещё не оплачен).
            2. Указан крайний срок оплаты (due_date).
            3. Крайний срок оплаты прошёл (due_date < сегодня).

        Args:
            payment: Платёж для проверки.

        Returns:
            bool: True, если платёж просрочен и должен быть
                переведён в статус OVERDUE.
        """
        return (
            payment.status == PaymentStatus.PENDING
            and payment.due_date is not None
            and payment.due_date < date.today()
        )
