"""Доменные события подсистемы LMS (Learning Management System).

Этот модуль определяет доменные события, которые генерируются
при значимых изменениях состояния агрегатов LMS. События используются
для слабой связанности (loose coupling) между доменными агрегатами
и для реализации побочных эффектов (например, пересчёт статистики,
уведомления).

Все события являются неизменяемыми (frozen dataclass) и наследуются
от базового класса DomainEvent, который предоставляет уникальный
идентификатор события и временную метку.

Классы:
    LessonConductedEvent: Урок был проведён.
    LessonCancelledEvent: Урок был отменён.
    StudentRiskChangedEvent: Изменился уровень риска отчисления студента.
    StudentEnrolledEvent: Студент зачислен в группу.
    PaymentReceivedEvent: Получен платёж от студента.
"""

from dataclasses import dataclass
from uuid import UUID

from src.domain.shared.events import DomainEvent


@dataclass(frozen=True)
class LessonConductedEvent(DomainEvent):
    """Событие проведения урока.

    Генерируется при переводе урока в статус COMPLETED.
    Используется для запуска побочных эффектов: обновление
    статистики посещаемости, начисление геймификационных баллов.

    Attributes:
        lesson_id: Уникальный идентификатор проведённого урока.
        group_id: Идентификатор группы, для которой проведён урок.
        teacher_id: Идентификатор преподавателя (может быть None,
            если преподаватель не назначен).
    """

    lesson_id: UUID = None  # type: ignore[assignment]
    group_id: UUID = None   # type: ignore[assignment]
    teacher_id: UUID | None = None


@dataclass(frozen=True)
class LessonCancelledEvent(DomainEvent):
    """Событие отмены урока.

    Генерируется при переводе урока в статус CANCELLED.
    Может использоваться для уведомления студентов и преподавателя
    об отмене занятия.

    Attributes:
        lesson_id: Уникальный идентификатор отменённого урока.
        group_id: Идентификатор группы, для которой отменён урок.
        reason: Причина отмены (обязательное поле, не может быть пустым).
    """

    lesson_id: UUID = None  # type: ignore[assignment]
    group_id: UUID = None   # type: ignore[assignment]
    reason: str = ""


@dataclass(frozen=True)
class StudentRiskChangedEvent(DomainEvent):
    """Событие изменения уровня риска отчисления студента.

    Генерируется при пересчёте уровня риска, если новый уровень
    отличается от предыдущего. Используется для оповещения МУП
    и директора о студентах, требующих внимания.

    Attributes:
        student_id: Уникальный идентификатор студента.
        old_level: Предыдущий уровень риска (low/medium/high/critical).
        new_level: Новый уровень риска (low/medium/high/critical).
    """

    student_id: UUID = None  # type: ignore[assignment]
    old_level: str = ""
    new_level: str = ""


@dataclass(frozen=True)
class StudentEnrolledEvent(DomainEvent):
    """Событие зачисления студента в группу.

    Генерируется при добавлении студента в учебную группу.
    Может использоваться для автоматического создания записей
    посещаемости и начисления приветственных баллов.

    Attributes:
        student_id: Уникальный идентификатор студента.
        group_id: Идентификатор группы, в которую зачислен студент.
    """

    student_id: UUID = None  # type: ignore[assignment]
    group_id: UUID = None    # type: ignore[assignment]


@dataclass(frozen=True)
class PaymentReceivedEvent(DomainEvent):
    """Событие получения платежа от студента.

    Генерируется при успешной оплате (полной или частичной).
    Может использоваться для обновления баланса контракта
    и отправки уведомления о получении средств.

    Attributes:
        payment_id: Уникальный идентификатор платежа.
        student_id: Идентификатор студента, совершившего оплату.
        amount: Сумма платежа в виде строки (для сериализации Decimal).
    """

    payment_id: UUID = None   # type: ignore[assignment]
    student_id: UUID = None   # type: ignore[assignment]
    amount: str = ""
