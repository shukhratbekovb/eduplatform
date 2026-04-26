#!/usr/bin/env python3
"""Обучение ML-модели оценки риска отчисления студентов на синтетическом датасете.

Скрипт реализует полный пайплайн обучения:
    1. Загрузка CSV-датасета (5000 строк, 14 признаков + целевая переменная).
    2. Стратифицированное разделение на train/test (80/20).
    3. Построение sklearn Pipeline: StandardScaler + GradientBoostingClassifier.
    4. 5-fold кросс-валидация (ROC-AUC) на обучающей выборке.
    5. Калибровка вероятностей через CalibratedClassifierCV (isotonic).
    6. Оценка на тестовой выборке (ROC-AUC, classification_report).
    7. Вывод feature importances из базового GBC.
    8. Сохранение модели в .joblib и списка признаков в .json.
    9. Верификация: загрузка модели и проверка предсказания.

Гиперпараметры GBC:
    - n_estimators=200, max_depth=4, learning_rate=0.1
    - min_samples_leaf=20, subsample=0.8
    - random_state=42

Входные данные: ``backend/src/ml/data/risk_dataset.csv``
Выходные данные:
    - ``backend/src/ml/models/risk_model.joblib`` (~120 KB)
    - ``backend/src/ml/models/feature_names.json``

Запуск:
    .. code-block:: bash

        cd backend && python scripts/train_risk_model.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

import joblib

DATA_PATH = Path(__file__).resolve().parent.parent / "src" / "ml" / "data" / "risk_dataset.csv"
MODEL_DIR = Path(__file__).resolve().parent.parent / "src" / "ml" / "models"

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

TARGET = "dropped_out"


def main() -> None:
    """Основная функция обучения модели.

    Последовательно выполняет все этапы пайплайна обучения:
    загрузку данных, разделение, обучение, калибровку, оценку,
    вывод feature importances и сохранение артефактов.

    Выводит в stdout:
        - Размер датасета и dropout rate.
        - Размеры train/test выборок.
        - ROC-AUC кросс-валидации (среднее +/- std).
        - ROC-AUC и classification_report на тесте.
        - Ранжированные feature importances.
        - Путь и размер сохранённой модели.
        - Верификация предсказания на 3 примерах.
    """
    print("=" * 60)
    print("Student Risk Scoring — Model Training")
    print("=" * 60)

    # 1. Load data
    df = pd.read_csv(DATA_PATH)
    print(f"\nDataset: {len(df)} rows, {len(df.columns)} columns")
    print(f"Dropout rate: {df[TARGET].mean():.2%}")

    X = df[FEATURE_NAMES].values
    y = df[TARGET].astype(int).values

    # 2. Train/test split (stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # 3. Build pipeline: Scaler + GBC
    base_gbc = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        min_samples_leaf=20,
        subsample=0.8,
        random_state=42,
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", base_gbc),
    ])

    # 4. Cross-validation
    print("\n--- Cross-Validation (5-fold) ---")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"ROC-AUC (CV): {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    # 5. Fit on full training set
    pipeline.fit(X_train, y_train)

    # 6. Calibrate probabilities
    print("\n--- Probability Calibration ---")
    calibrated = CalibratedClassifierCV(pipeline, cv=5, method="isotonic")
    calibrated.fit(X_train, y_train)

    # 7. Evaluate on test set
    y_pred = calibrated.predict(X_test)
    y_proba = calibrated.predict_proba(X_test)[:, 1]

    print("\n--- Test Set Metrics ---")
    print(f"ROC-AUC: {roc_auc_score(y_test, y_proba):.4f}")
    print()
    print(classification_report(y_test, y_pred, target_names=["active", "dropout"]))

    # 8. Feature importances (from base GBC inside pipeline)
    gbc = pipeline.named_steps["classifier"]
    importances = gbc.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]

    print("--- Feature Importances ---")
    for idx in sorted_idx:
        bar = "#" * int(importances[idx] * 50)
        print(f"  {FEATURE_NAMES[idx]:30s} {importances[idx]:.4f}  {bar}")

    # 9. Save model + feature names
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    model_path = MODEL_DIR / "risk_model.joblib"
    joblib.dump(calibrated, model_path, compress=3)
    print(f"\nModel saved: {model_path} ({model_path.stat().st_size / 1024:.0f} KB)")

    names_path = MODEL_DIR / "feature_names.json"
    with open(names_path, "w") as f:
        json.dump(FEATURE_NAMES, f, indent=2)
    print(f"Feature names saved: {names_path}")

    # 10. Verify load works
    loaded = joblib.load(model_path)
    test_proba = loaded.predict_proba(X_test[:3])[:, 1]
    print(f"\nVerification — first 3 test probabilities: {test_proba.round(4).tolist()}")
    print("\nDone!")


if __name__ == "__main__":
    main()
