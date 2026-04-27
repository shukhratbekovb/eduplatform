"""Базовый класс доменных событий.

Этот модуль определяет базовый класс DomainEvent, от которого
наследуются все доменные события в системе. Каждое событие
автоматически получает уникальный идентификатор и временную метку.

Доменные события — ключевой элемент архитектуры DDD, обеспечивающий
слабую связанность между агрегатами и позволяющий реализовать
побочные эффекты (уведомления, пересчёт статистики, аудит).
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID, uuid4


@dataclass(frozen=True)
class DomainEvent:
    """Базовый класс доменного события.

    Все доменные события наследуются от этого класса.
    Является неизменяемым (frozen), чтобы гарантировать
    целостность данных события после его создания.

    Attributes:
        event_id: Уникальный идентификатор события (UUID v4).
            Генерируется автоматически.
        occurred_at: Временная метка возникновения события (UTC).
            Устанавливается автоматически в момент создания.

    Example:
        >>> @dataclass(frozen=True)
        ... class StudentEnrolledEvent(DomainEvent):
        ...     student_id: UUID = None
        ...     group_id: UUID = None
    """

    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))
