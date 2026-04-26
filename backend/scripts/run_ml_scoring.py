"""Запуск ML-скоринга риска отчисления для всех активных студентов.

Скрипт выполняет одноразовый пересчёт уровня риска для всех студентов
с is_active=True, используя обученную ML-модель. Обновляет поля
risk_level и risk_last_updated в таблице students.

Используется для:
    - Первичного скоринга после seed (seed_full.py не запускает ML).
    - Ручного пересчёта при необходимости (вне Celery beat).
    - Отладки и проверки работоспособности ML-пайплайна.

Алгоритм:
    1. Загрузка ID всех активных студентов.
    2. Batch-извлечение 14 признаков через RiskFeatureExtractor.
    3. Batch-предсказание вероятностей через RiskPredictor.
    4. Маппинг вероятностей в RiskLevel (LOW/MEDIUM/HIGH/CRITICAL).
    5. UPDATE students SET risk_level, risk_last_updated.
    6. Вывод распределения по уровням риска.

Запуск:
    .. code-block:: bash

        docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/run_ml_scoring.py"
"""
import asyncio
import uuid

from sqlalchemy import select, text
from src.database import async_session_factory
from src.infrastructure.persistence.models.lms import StudentModel
from src.ml.feature_extractor import RiskFeatureExtractor
from src.ml.predictor import RiskPredictor
from src.ml.risk_scorer import probability_to_risk_level


async def main() -> None:
    """Основная функция ML-скоринга.

    Выполняет полный цикл: загрузка студентов -> извлечение признаков ->
    предсказание -> обновление БД. Выводит распределение по уровням риска.

    Предполагает наличие обученной модели в
    ``backend/src/ml/models/risk_model.joblib``.

    Raises:
        FileNotFoundError: Если ML-модель не найдена (RiskPredictor.get_instance()).
    """
    print("Running ML risk scoring for all students...")

    async with async_session_factory() as session:
        rows = (await session.execute(
            select(StudentModel.id).where(StudentModel.is_active.is_(True))
        )).scalars().all()

        student_ids = list(rows)
        print(f"  Found {len(student_ids)} active students")

        extractor = RiskFeatureExtractor(session)
        predictor = RiskPredictor.get_instance()

        all_features = await extractor.extract_batch(student_ids)
        features_list = [all_features.get(sid, {}) for sid in student_ids]
        probas = predictor.predict_batch(features_list)

        risk_dist = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        for sid, prob in zip(student_ids, probas):
            level = probability_to_risk_level(prob)
            risk_dist[level.value] += 1
            await session.execute(text("""
                UPDATE students SET risk_level = :rl, risk_last_updated = now() WHERE id = :sid
            """), {"rl": level.value, "sid": str(sid)})

        await session.commit()

    print(f"  Risk distribution: {risk_dist}")
    print("  Done!")


if __name__ == "__main__":
    asyncio.run(main())
