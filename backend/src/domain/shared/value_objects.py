"""Объекты-значения (Value Objects) доменного слоя.

Этот модуль определяет неизменяемые объекты-значения (Value Objects)
согласно паттернам Domain-Driven Design. В отличие от сущностей (Entity),
объекты-значения определяются своими атрибутами, а не идентификатором.

Все value objects реализованы как frozen dataclass, что гарантирует
их неизменяемость после создания. Валидация выполняется в ``__post_init__``.

Классы:
    Email: Валидированный адрес электронной почты.
    Phone: Валидированный номер телефона.
    Money: Денежная сумма с валютой (по умолчанию UZS).
    TimeRange: Временной диапазон в формате HH:MM.
    Grade: Оценка по 12-балльной шкале.
"""

import re
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Email:
    """Объект-значение для адреса электронной почты.

    Выполняет валидацию формата email при создании с помощью
    регулярного выражения. Неизменяемый (frozen).

    Attributes:
        value: Строковое значение email-адреса.

    Raises:
        ValueError: Если email не соответствует формату
            ``user@domain.tld``.

    Example:
        >>> email = Email("director@edu.uz")
        >>> str(email)
        'director@edu.uz'
        >>> Email("invalid")  # ValueError
    """

    value: str

    def __post_init__(self) -> None:
        """Валидирует формат email-адреса при создании.

        Raises:
            ValueError: Если значение не соответствует паттерну email.
        """
        pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, self.value):
            raise ValueError(f"Invalid email: {self.value}")

    def __str__(self) -> str:
        """Возвращает строковое представление email.

        Returns:
            str: Значение email-адреса.
        """
        return self.value


@dataclass(frozen=True)
class Phone:
    """Объект-значение для телефонного номера.

    Принимает номера в международном формате с необязательным
    префиксом ``+``. Игнорирует пробелы, дефисы и скобки
    при валидации.

    Attributes:
        value: Строковое значение номера телефона.

    Raises:
        ValueError: Если номер содержит менее 7 или более 15 цифр.

    Example:
        >>> phone = Phone("+998 (90) 123-45-67")
        >>> str(phone)
        '+998 (90) 123-45-67'
    """

    value: str

    def __post_init__(self) -> None:
        """Валидирует формат телефонного номера при создании.

        Удаляет пробелы, дефисы и скобки перед проверкой.
        Номер должен содержать от 7 до 15 цифр с необязательным ``+``.

        Raises:
            ValueError: Если номер не соответствует формату.
        """
        digits = re.sub(r"[\s\-()]+", "", self.value)
        if not re.match(r"^\+?\d{7,15}$", digits):
            raise ValueError(f"Invalid phone: {self.value}")

    def __str__(self) -> str:
        """Возвращает строковое представление телефона.

        Returns:
            str: Исходное значение номера телефона.
        """
        return self.value


@dataclass(frozen=True)
class Money:
    """Объект-значение для денежной суммы с валютой.

    Инкапсулирует денежную сумму и валюту. По умолчанию используется
    узбекский сум (UZS). Сумма не может быть отрицательной.

    Поддерживает операцию сложения двух Money с одинаковой валютой.

    Attributes:
        amount: Сумма в формате Decimal (для точных финансовых вычислений).
        currency: Код валюты ISO 4217 (по умолчанию "UZS").

    Raises:
        ValueError: Если сумма отрицательная.

    Example:
        >>> price = Money(Decimal("1500000"), "UZS")
        >>> discount = Money(Decimal("500000"), "UZS")
        >>> total = price + discount
        >>> str(total)
        '2000000 UZS'
    """

    amount: Decimal
    currency: str = "UZS"

    def __post_init__(self) -> None:
        """Валидирует неотрицательность суммы при создании.

        Raises:
            ValueError: Если amount < 0.
        """
        if self.amount < Decimal("0"):
            raise ValueError("Money amount cannot be negative")

    def __add__(self, other: "Money") -> "Money":
        """Складывает две денежные суммы.

        Args:
            other: Другая денежная сумма для сложения.

        Returns:
            Money: Новый объект Money с суммой двух значений.

        Raises:
            ValueError: Если валюты не совпадают.
        """
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)

    def __str__(self) -> str:
        """Возвращает строковое представление суммы с валютой.

        Returns:
            str: Строка вида "1500000 UZS".
        """
        return f"{self.amount} {self.currency}"


@dataclass(frozen=True)
class TimeRange:
    """Объект-значение для временного диапазона урока.

    Представляет период времени с началом и концом в формате HH:MM.
    Используется для валидации расписания уроков и проверки
    конфликтов (пересечений) по времени.

    Attributes:
        start: Время начала в формате "HH:MM".
        end: Время окончания в формате "HH:MM".

    Raises:
        ValueError: Если формат не соответствует HH:MM
            или start >= end.

    Example:
        >>> tr = TimeRange("09:00", "10:30")
        >>> tr.start
        '09:00'
    """

    start: str  # "HH:MM"
    end: str    # "HH:MM"

    def __post_init__(self) -> None:
        """Валидирует формат и логическую корректность диапазона.

        Проверяет, что оба значения соответствуют формату HH:MM
        и что время начала строго меньше времени окончания.

        Raises:
            ValueError: Если формат неверный или start >= end.
        """
        pattern = r"^\d{2}:\d{2}$"
        if not re.match(pattern, self.start) or not re.match(pattern, self.end):
            raise ValueError("TimeRange must be in HH:MM format")
        if self.start >= self.end:
            raise ValueError("start must be before end")


@dataclass(frozen=True)
class Grade:
    """Объект-значение для оценки по 12-балльной шкале.

    Используется в доменном слое для типобезопасного представления
    оценок. В реальной системе GPA пересчитывается по 10-балльной
    шкале: ``score / max_score * 10``.

    Attributes:
        value: Числовое значение оценки (от 1 до 12 включительно).

    Raises:
        ValueError: Если значение выходит за пределы диапазона [1, 12].

    Example:
        >>> grade = Grade(10)
        >>> grade.value
        10
    """

    value: int

    def __post_init__(self) -> None:
        """Валидирует, что оценка находится в допустимом диапазоне.

        Raises:
            ValueError: Если value < 1 или value > 12.
        """
        if not (1 <= self.value <= 12):
            raise ValueError(f"Grade must be between 1 and 12, got {self.value}")
