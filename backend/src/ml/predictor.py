"""Загрузка обученной ML-модели и выполнение инференса для оценки риска отчисления.

Модуль реализует класс ``RiskPredictor`` — синглтон, который загружает
обученный sklearn-пайплайн (StandardScaler + CalibratedClassifierCV поверх
GradientBoostingClassifier) из файла .joblib и предоставляет методы
для предсказания вероятности отчисления.

Модель загружается один раз при старте приложения (в lifespan FastAPI)
и переиспользуется для всех последующих запросов. Поддерживается как
поштучное предсказание, так и пакетное (более эффективное за счёт
векторизации numpy).

Файлы модели:
    - ``models/risk_model.joblib`` — сериализованный sklearn-пайплайн (~120 KB)
    - ``models/feature_names.json`` — упорядоченный список имён 14 признаков
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import ClassVar

import joblib
import numpy as np

from src.ml.feature_extractor import FEATURE_NAMES

# Default model path (relative to backend/ root)
_DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "risk_model.joblib"
_DEFAULT_NAMES_PATH = Path(__file__).resolve().parent / "models" / "feature_names.json"


class RiskPredictor:
    """Синглтон для загрузки обученной sklearn-модели и выполнения инференса.

    Загружает CalibratedClassifierCV (калиброванный GradientBoostingClassifier)
    из .joblib файла. Предоставляет predict_proba для одного студента и
    predict_batch для множества студентов.

    Паттерн Singleton гарантирует, что модель загружается в память только
    один раз за время жизни процесса.

    Attributes:
        _instance: Единственный экземпляр класса (ClassVar).
        _pipeline: Загруженный sklearn-пайплайн.
        _feature_names: Упорядоченный список имён признаков для формирования
            входного вектора.
        _importances: Кэш важности признаков из базового GBC.
    """

    _instance: ClassVar[RiskPredictor | None] = None

    def __init__(self, model_path: Path | None = None) -> None:
        """Загружает модель из файла.

        Args:
            model_path: Путь к .joblib файлу модели. Если None, используется
                путь по умолчанию (``models/risk_model.joblib`` рядом с модулем).

        Raises:
            FileNotFoundError: Если файл модели не найден по указанному пути.
        """
        mp = model_path or _DEFAULT_MODEL_PATH
        if not mp.exists():
            raise FileNotFoundError(f"ML model not found at {mp}")
        self._pipeline = joblib.load(mp)

        np_ = _DEFAULT_NAMES_PATH
        if np_.exists():
            with open(np_) as f:
                self._feature_names: list[str] = json.load(f)
        else:
            self._feature_names = FEATURE_NAMES

        # Cache feature importances from the base estimator
        self._importances: dict[str, float] | None = None

    @classmethod
    def get_instance(cls) -> RiskPredictor:
        """Возвращает или создаёт единственный экземпляр предиктора.

        При первом вызове загружает модель с диска. Последующие вызовы
        возвращают тот же экземпляр без повторной загрузки.

        Returns:
            Экземпляр RiskPredictor с загруженной моделью.

        Raises:
            FileNotFoundError: Если файл модели не найден (при первом вызове).
        """
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Сбрасывает синглтон (используется в тестах).

        После вызова следующий ``get_instance()`` повторно загрузит модель
        с диска. Полезно для тестирования с мок-моделями.
        """
        cls._instance = None

    def predict_proba(self, features: dict[str, float]) -> float:
        """Предсказывает вероятность отчисления для одного студента.

        Формирует входной вектор из словаря признаков в правильном порядке,
        вызывает predict_proba sklearn-модели и возвращает вероятность
        класса 1 (dropout).

        Args:
            features: Словарь {имя_признака: значение} из 14 признаков.
                Отсутствующие признаки заменяются нулём.

        Returns:
            Вероятность отчисления в диапазоне [0.0, 1.0].
        """
        x = np.array([[features.get(name, 0.0) for name in self._feature_names]])
        proba = self._pipeline.predict_proba(x)[0]
        # Class 1 = dropout
        return float(proba[1]) if len(proba) > 1 else float(proba[0])

    def predict_batch(self, features_list: list[dict[str, float]]) -> list[float]:
        """Пакетное предсказание вероятности отчисления.

        Более эффективно, чем вызов predict_proba N раз, так как
        формирует единую numpy-матрицу и выполняет один вызов модели.

        Args:
            features_list: Список словарей признаков, по одному на студента.

        Returns:
            Список вероятностей отчисления в том же порядке, что и входной
            список. Пустой список, если входной список пуст.
        """
        if not features_list:
            return []
        x = np.array([[f.get(name, 0.0) for name in self._feature_names] for f in features_list])
        probas = self._pipeline.predict_proba(x)
        return [float(p[1]) if len(p) > 1 else float(p[0]) for p in probas]

    def feature_importances(self) -> dict[str, float]:
        """Возвращает маппинг имя_признака -> важность из обученной модели.

        Извлекает feature_importances_ из базового GradientBoostingClassifier,
        который может быть обёрнут в CalibratedClassifierCV и Pipeline.
        Результат кэшируется после первого вызова.

        При невозможности извлечь важности (например, если структура модели
        изменилась) возвращает равномерное распределение (1/14 для каждого признака).

        Returns:
            Словарь {имя_признака: важность}, где сумма всех важностей = 1.0.
        """
        if self._importances is not None:
            return self._importances

        importances: dict[str, float] = {}
        try:
            # CalibratedClassifierCV wraps the pipeline
            base = self._pipeline
            if hasattr(base, "estimator"):
                base = base.estimator
            if hasattr(base, "named_steps"):
                clf = base.named_steps.get("classifier")
                if clf and hasattr(clf, "feature_importances_"):
                    for name, imp in zip(self._feature_names, clf.feature_importances_, strict=False):
                        importances[name] = float(imp)
        except Exception:
            # Fallback: equal importances
            for name in self._feature_names:
                importances[name] = 1.0 / len(self._feature_names)

        self._importances = importances
        return importances
