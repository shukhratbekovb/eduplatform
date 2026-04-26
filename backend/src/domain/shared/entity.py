"""Базовые сущности доменного слоя.

Этот модуль определяет фундаментальные строительные блоки доменного слоя
согласно паттернам Domain-Driven Design (DDD):

- **Entity** — базовая сущность с уникальным идентификатором (UUID).
  Две сущности считаются равными, если совпадают их идентификаторы.
- **AggregateRoot** — корень агрегата, расширяющий Entity поддержкой
  доменных событий (Domain Events).

Все доменные сущности проекта наследуются от Entity или AggregateRoot.

Типичное использование:
    @dataclass
    class Student(AggregateRoot):
        full_name: str = ""
        # ...
"""

from dataclasses import dataclass, field
from uuid import UUID, uuid4

from src.domain.shared.events import DomainEvent


@dataclass
class Entity:
    """Базовая сущность с уникальным идентификатором.

    Реализует паттерн Entity из DDD: идентичность определяется
    по уникальному идентификатору (UUID), а не по значениям атрибутов.

    Attributes:
        id: Уникальный идентификатор сущности (UUID v4).
            Генерируется автоматически при создании.
    """

    id: UUID = field(default_factory=uuid4)

    def __eq__(self, other: object) -> bool:
        """Сравнивает сущности по идентификатору.

        Args:
            other: Объект для сравнения.

        Returns:
            bool: True, если other является Entity и имеет
                тот же идентификатор.
        """
        if not isinstance(other, Entity):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        """Возвращает хэш сущности на основе идентификатора.

        Returns:
            int: Хэш UUID идентификатора.
        """
        return hash(self.id)


@dataclass
class AggregateRoot(Entity):
    """Корень агрегата — сущность, накапливающая доменные события.

    Расширяет базовую Entity возможностью регистрации доменных событий.
    События накапливаются в приватном списке и извлекаются слоем
    приложения (Application Layer) после сохранения агрегата
    для дальнейшей обработки (публикация, побочные эффекты).

    Паттерн позволяет сущностям генерировать события без зависимости
    от инфраструктуры (шина событий, очередь сообщений).

    Attributes:
        _events: Приватный список накопленных доменных событий.
            Не включается в ``__init__`` и ``__repr__``.

    Example:
        >>> student = Student(full_name="Алиев Шахзод")
        >>> student.add_event(StudentRiskChangedEvent(...))
        >>> events = student.pull_events()
        >>> len(events)
        1
        >>> student.pull_events()  # повторный вызов — пустой список
        []
    """

    _events: list[DomainEvent] = field(default_factory=list, init=False, repr=False)

    def add_event(self, event: DomainEvent) -> None:
        """Регистрирует доменное событие в агрегате.

        Событие будет храниться до вызова ``pull_events()``.

        Args:
            event: Доменное событие для регистрации.
        """
        self._events.append(event)

    def pull_events(self) -> list[DomainEvent]:
        """Извлекает и очищает список накопленных доменных событий.

        Используется слоем приложения после сохранения агрегата
        в репозитории для обработки побочных эффектов.

        Returns:
            list[DomainEvent]: Список всех накопленных событий.
                После вызова внутренний список очищается.
        """
        events, self._events = self._events, []
        return events

    @property
    def domain_events(self) -> list[DomainEvent]:
        """Возвращает копию списка текущих доменных событий без очистки.

        В отличие от ``pull_events()``, не очищает внутренний список.
        Используется для инспекции событий без их потребления.

        Returns:
            list[DomainEvent]: Копия списка накопленных событий.
        """
        return list(self._events)
