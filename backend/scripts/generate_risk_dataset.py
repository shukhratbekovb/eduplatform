#!/usr/bin/env python3
"""Генерация синтетического датасета для обучения ML-модели оценки риска отчисления.

Скрипт создаёт ~5000 студенческих профилей с 14 числовыми признаками
и бинарной целевой переменной ``dropped_out`` (0 = активен, 1 = отчислен).

Данные генерируются на основе 5 поведенческих архетипов:
    - **strong** (35%): высокая посещаемость, высокие оценки, нет долгов.
      Вероятность отчисления: 0%.
    - **average** (25%): умеренные показатели, редкие пропуски.
      Вероятность отчисления: 0%.
    - **struggling** (20%): ниже среднего, нестабильные оценки.
      Вероятность отчисления: ~30%.
    - **declining** (12%): начинал средне, тренд вниз.
      Вероятность отчисления: ~70%.
    - **at_risk** (8%): плохие показатели по всем доменам.
      Вероятность отчисления: ~85%.

Внутри каждого архетипа используются бета-распределения (np.random.Generator.beta)
для генерации реалистичных корреляций между признаками.

Результирующий датасет сбалансирован: ~27% отчисленных, ~73% активных.

Запуск:
    .. code-block:: bash

        cd backend && python scripts/generate_risk_dataset.py

Выходной файл: ``backend/src/ml/data/risk_dataset.csv``
"""
from __future__ import annotations

import csv
import os
import random
from pathlib import Path

import numpy as np

SEED = 42
N_STUDENTS = 5000

FEATURE_NAMES = [
    # Attendance (4)
    "attendance_rate_14d",
    "attendance_rate_30d",
    "absence_streak",
    "late_ratio_14d",
    # Grades (4)
    "gpa_overall",
    "avg_grade_last5",
    "grade_trend",
    "exam_fail_rate",
    # Homework (3)
    "homework_completion_rate",
    "overdue_rate",
    "missed_homework_streak",
    # Payments (3)
    "has_overdue_payment",
    "max_debt_days",
    "overdue_payment_count",
]

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "src" / "ml" / "data"


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Ограничивает значение в заданном диапазоне [lo, hi].

    Args:
        v: Исходное значение.
        lo: Нижняя граница (по умолчанию 0.0).
        hi: Верхняя граница (по умолчанию 1.0).

    Returns:
        Значение, ограниченное диапазоном [lo, hi].
    """
    return max(lo, min(hi, v))


def generate_strong(rng: np.random.Generator) -> tuple[dict[str, float], int]:
    """Генерирует профиль сильного студента.

    Характеристики: высокая посещаемость (beta(8, 1.5) ~ 0.85-1.0),
    высокий GPA (beta(7, 2) ~ 0.7-1.0), почти полное выполнение ДЗ,
    отсутствие задолженностей. Отчисление: 0%.

    Args:
        rng: Генератор случайных чисел numpy.

    Returns:
        Кортеж (словарь 14 признаков, метка класса 0).
    """
    att_14 = clamp(rng.beta(8, 1.5) * 1.0)
    att_30 = clamp(att_14 + rng.normal(0, 0.03))
    absence_streak = 0.0 if rng.random() > 0.15 else rng.integers(1, 3) / 10.0
    late_ratio = clamp(rng.beta(1.5, 12))

    gpa = clamp(rng.beta(7, 2) * 1.0)
    avg_last5 = clamp(gpa + rng.normal(0.02, 0.05))
    grade_trend = clamp(rng.normal(0.55, 0.1))  # slightly positive
    exam_fail = clamp(rng.beta(1.2, 15))

    hw_completion = clamp(rng.beta(8, 1.5))
    overdue_rate = clamp(rng.beta(1.2, 15))
    missed_streak = 0.0

    has_overdue = 0.0
    max_debt_days = 0.0
    overdue_count = 0.0

    features = {
        "attendance_rate_14d": att_14,
        "attendance_rate_30d": att_30,
        "absence_streak": absence_streak,
        "late_ratio_14d": late_ratio,
        "gpa_overall": gpa,
        "avg_grade_last5": avg_last5,
        "grade_trend": grade_trend,
        "exam_fail_rate": exam_fail,
        "homework_completion_rate": hw_completion,
        "overdue_rate": overdue_rate,
        "missed_homework_streak": missed_streak,
        "has_overdue_payment": has_overdue,
        "max_debt_days": max_debt_days,
        "overdue_payment_count": overdue_count,
    }
    label = 0
    return features, label


def generate_average(rng: np.random.Generator) -> tuple[dict[str, float], int]:
    """Генерирует профиль среднего студента.

    Характеристики: умеренная посещаемость (beta(5, 2) ~ 0.6-0.9),
    средний GPA (beta(5, 3) ~ 0.4-0.8), редкие пропуски ДЗ,
    15% шанс просрочки по платежам. Отчисление: 0%.

    Args:
        rng: Генератор случайных чисел numpy.

    Returns:
        Кортеж (словарь 14 признаков, метка класса 0).
    """
    att_14 = clamp(rng.beta(5, 2) * 0.95 + 0.05)
    att_30 = clamp(att_14 + rng.normal(-0.02, 0.04))
    absence_streak = rng.choice([0, 0, 0, 1, 1, 2]) / 10.0
    late_ratio = clamp(rng.beta(2, 8))

    gpa = clamp(rng.beta(5, 3) * 0.85 + 0.15)
    avg_last5 = clamp(gpa + rng.normal(0, 0.07))
    grade_trend = clamp(rng.normal(0.5, 0.12))
    exam_fail = clamp(rng.beta(2, 8))

    hw_completion = clamp(rng.beta(5, 2) * 0.9 + 0.1)
    overdue_rate = clamp(rng.beta(2, 8))
    missed_streak = rng.choice([0, 0, 0, 1, 1, 2]) / 10.0

    has_overdue = 1.0 if rng.random() < 0.15 else 0.0
    max_debt_days = clamp(rng.exponential(0.05)) if has_overdue else 0.0
    overdue_count = clamp(rng.choice([1, 1, 2]) / 5.0) if has_overdue else 0.0

    features = {
        "attendance_rate_14d": att_14,
        "attendance_rate_30d": att_30,
        "absence_streak": absence_streak,
        "late_ratio_14d": late_ratio,
        "gpa_overall": gpa,
        "avg_grade_last5": avg_last5,
        "grade_trend": grade_trend,
        "exam_fail_rate": exam_fail,
        "homework_completion_rate": hw_completion,
        "overdue_rate": overdue_rate,
        "missed_homework_streak": missed_streak,
        "has_overdue_payment": has_overdue,
        "max_debt_days": max_debt_days,
        "overdue_payment_count": overdue_count,
    }
    label = 0
    return features, label


def generate_struggling(rng: np.random.Generator) -> tuple[dict[str, float], int]:
    """Генерирует профиль студента с трудностями.

    Характеристики: посещаемость ниже среднего (beta(3, 3) ~ 0.3-0.7),
    средне-низкий GPA, нерегулярное выполнение ДЗ, 35% шанс задолженности.
    ~30% из этого архетипа будут отчислены.

    Args:
        rng: Генератор случайных чисел numpy.

    Returns:
        Кортеж (словарь 14 признаков, метка класса 0 или 1).
    """
    att_14 = clamp(rng.beta(3, 3) * 0.7 + 0.1)
    att_30 = clamp(att_14 + rng.normal(-0.05, 0.05))
    absence_streak = rng.choice([0, 1, 2, 2, 3, 4]) / 10.0
    late_ratio = clamp(rng.beta(3, 6))

    gpa = clamp(rng.beta(3, 4) * 0.7 + 0.1)
    avg_last5 = clamp(gpa + rng.normal(-0.05, 0.08))
    grade_trend = clamp(rng.normal(0.42, 0.15))  # slightly negative
    exam_fail = clamp(rng.beta(3, 5))

    hw_completion = clamp(rng.beta(3, 3) * 0.7 + 0.1)
    overdue_rate = clamp(rng.beta(3, 5))
    missed_streak = rng.choice([0, 1, 2, 3, 3, 4]) / 10.0

    has_overdue = 1.0 if rng.random() < 0.35 else 0.0
    max_debt_days = clamp(rng.exponential(0.15)) if has_overdue else 0.0
    overdue_count = clamp(rng.choice([1, 1, 2, 2, 3]) / 5.0) if has_overdue else 0.0

    features = {
        "attendance_rate_14d": att_14,
        "attendance_rate_30d": att_30,
        "absence_streak": absence_streak,
        "late_ratio_14d": late_ratio,
        "gpa_overall": gpa,
        "avg_grade_last5": avg_last5,
        "grade_trend": grade_trend,
        "exam_fail_rate": exam_fail,
        "homework_completion_rate": hw_completion,
        "overdue_rate": overdue_rate,
        "missed_homework_streak": missed_streak,
        "has_overdue_payment": has_overdue,
        "max_debt_days": max_debt_days,
        "overdue_payment_count": overdue_count,
    }
    label = 1 if rng.random() < 0.30 else 0
    return features, label


def generate_declining(rng: np.random.Generator) -> tuple[dict[str, float], int]:
    """Генерирует профиль студента с нисходящей динамикой.

    Характеристики: начинал средне, но показатели ухудшаются —
    att_30d выше att_14d (посещаемость падает), avg_grade_last5 < gpa_overall
    (оценки снижаются), grade_trend < 0.5 (отрицательный тренд).
    55% шанс задолженности. ~70% будут отчислены.

    Ключевой архетип для ML-модели: позволяет обнаружить студентов
    с падающими показателями, которые ещё не достигли критического уровня.

    Args:
        rng: Генератор случайных чисел numpy.

    Returns:
        Кортеж (словарь 14 признаков, метка класса 0 или 1).
    """
    att_14 = clamp(rng.beta(2.5, 3) * 0.65 + 0.05)
    att_30 = clamp(att_14 + rng.normal(0.08, 0.04))  # 30d better than 14d (declining)
    absence_streak = rng.choice([1, 2, 3, 4, 5, 6]) / 10.0
    late_ratio = clamp(rng.beta(3, 4))

    gpa = clamp(rng.beta(3, 3) * 0.65 + 0.15)
    avg_last5 = clamp(gpa - rng.uniform(0.05, 0.2))  # recent grades worse
    grade_trend = clamp(rng.normal(0.3, 0.1))  # negative trend
    exam_fail = clamp(rng.beta(4, 4))

    hw_completion = clamp(rng.beta(2.5, 3) * 0.65 + 0.05)
    overdue_rate = clamp(rng.beta(4, 4))
    missed_streak = rng.choice([2, 3, 4, 5, 5, 6]) / 10.0

    has_overdue = 1.0 if rng.random() < 0.55 else 0.0
    max_debt_days = clamp(rng.exponential(0.25)) if has_overdue else 0.0
    overdue_count = clamp(rng.choice([1, 2, 2, 3, 3]) / 5.0) if has_overdue else 0.0

    features = {
        "attendance_rate_14d": att_14,
        "attendance_rate_30d": att_30,
        "absence_streak": absence_streak,
        "late_ratio_14d": late_ratio,
        "gpa_overall": gpa,
        "avg_grade_last5": avg_last5,
        "grade_trend": grade_trend,
        "exam_fail_rate": exam_fail,
        "homework_completion_rate": hw_completion,
        "overdue_rate": overdue_rate,
        "missed_homework_streak": missed_streak,
        "has_overdue_payment": has_overdue,
        "max_debt_days": max_debt_days,
        "overdue_payment_count": overdue_count,
    }
    label = 1 if rng.random() < 0.70 else 0
    return features, label


def generate_at_risk(rng: np.random.Generator) -> tuple[dict[str, float], int]:
    """Генерирует профиль студента в зоне риска.

    Характеристики: низкая посещаемость (beta(2, 5) ~ 0.05-0.35),
    низкий GPA, длинные серии пропусков (3-10), высокий exam_fail_rate,
    75% шанс задолженности. ~85% будут отчислены.

    Этот архетип моделирует студентов, которые с высокой вероятностью
    покинут учебный центр без интервенции.

    Args:
        rng: Генератор случайных чисел numpy.

    Returns:
        Кортеж (словарь 14 признаков, метка класса 0 или 1).
    """
    att_14 = clamp(rng.beta(2, 5) * 0.55)
    att_30 = clamp(att_14 + rng.normal(0.05, 0.04))
    absence_streak = rng.choice([3, 4, 5, 6, 7, 8, 9, 10]) / 10.0
    late_ratio = clamp(rng.beta(4, 3))

    gpa = clamp(rng.beta(2, 5) * 0.5)
    avg_last5 = clamp(gpa - rng.uniform(0.02, 0.15))
    grade_trend = clamp(rng.normal(0.2, 0.1))  # strong negative trend
    exam_fail = clamp(rng.beta(5, 2))

    hw_completion = clamp(rng.beta(2, 5) * 0.5)
    overdue_rate = clamp(rng.beta(5, 2))
    missed_streak = rng.choice([4, 5, 6, 7, 8, 9, 10]) / 10.0

    has_overdue = 1.0 if rng.random() < 0.75 else 0.0
    max_debt_days = clamp(rng.exponential(0.4)) if has_overdue else 0.0
    overdue_count = clamp(rng.choice([2, 3, 3, 4, 5]) / 5.0) if has_overdue else 0.0

    features = {
        "attendance_rate_14d": att_14,
        "attendance_rate_30d": att_30,
        "absence_streak": absence_streak,
        "late_ratio_14d": late_ratio,
        "gpa_overall": gpa,
        "avg_grade_last5": avg_last5,
        "grade_trend": grade_trend,
        "exam_fail_rate": exam_fail,
        "homework_completion_rate": hw_completion,
        "overdue_rate": overdue_rate,
        "missed_homework_streak": missed_streak,
        "has_overdue_payment": has_overdue,
        "max_debt_days": max_debt_days,
        "overdue_payment_count": overdue_count,
    }
    label = 1 if rng.random() < 0.85 else 0
    return features, label


ARCHETYPES = [
    (0.35, generate_strong),
    (0.25, generate_average),
    (0.20, generate_struggling),
    (0.12, generate_declining),
    (0.08, generate_at_risk),
]


def main() -> None:
    """Основная функция генерации датасета.

    Последовательность действий:
        1. Инициализация ГСЧ с фиксированным seed (42) для воспроизводимости.
        2. Генерация N_STUDENTS профилей по пропорциям архетипов.
        3. Дозаполнение до точного N_STUDENTS случайными архетипами.
        4. Перемешивание строк.
        5. Запись CSV с 15 колонками (14 признаков + dropped_out).
        6. Вывод статистики (всего, отчислено, не отчислено).
    """
    rng = np.random.default_rng(SEED)
    random.seed(SEED)

    rows: list[dict[str, float]] = []

    for proportion, generator in ARCHETYPES:
        count = int(N_STUDENTS * proportion)
        for _ in range(count):
            features, label = generator(rng)
            row = {**features, "dropped_out": float(label)}
            rows.append(row)

    # Fill remaining to reach exactly N_STUDENTS
    while len(rows) < N_STUDENTS:
        archetype_fn = rng.choice([g for _, g in ARCHETYPES])
        features, label = archetype_fn(rng)
        rows.append({**features, "dropped_out": float(label)})

    # Shuffle
    rng.shuffle(rows)

    # Write CSV
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "risk_dataset.csv"
    fieldnames = FEATURE_NAMES + ["dropped_out"]

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: f"{row[k]:.6f}" for k in fieldnames})

    # Stats
    total = len(rows)
    dropouts = sum(1 for r in rows if r["dropped_out"] > 0.5)
    print(f"Generated {total} student profiles")
    print(f"  Dropouts: {dropouts} ({dropouts / total * 100:.1f}%)")
    print(f"  Non-dropouts: {total - dropouts} ({(total - dropouts) / total * 100:.1f}%)")
    print(f"  Output: {output_path}")


if __name__ == "__main__":
    main()
