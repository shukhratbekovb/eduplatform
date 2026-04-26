"""Пакет машинного обучения для прогнозирования риска отчисления студентов.

Данный пакет реализует полный ML-пайплайн для образовательной платформы EduPlatform:
от извлечения признаков из базы данных до предсказания вероятности отчисления студента.

Архитектура пакета:
    - ``feature_extractor`` — асинхронное извлечение 14 признаков из PostgreSQL
      (посещаемость, оценки, домашние задания, платежи).
    - ``predictor`` — загрузка обученной sklearn-модели (GradientBoostingClassifier
      с калибровкой вероятностей) и выполнение инференса.
    - ``risk_scorer`` — оркестратор, объединяющий извлечение признаков, предсказание
      и маппинг вероятности в дискретные уровни риска (LOW/MEDIUM/HIGH/CRITICAL).

Модель обучена на синтетическом датасете из 5000 студенческих профилей
(5 поведенческих архетипов) и сохранена в формате joblib.

Пример использования:
    .. code-block:: python

        from src.ml.risk_scorer import MLRiskScorer

        async with async_session_factory() as session:
            scorer = MLRiskScorer(session)
            result = await scorer.score_student(student_id)
            print(result.risk_level, result.dropout_probability)
"""
