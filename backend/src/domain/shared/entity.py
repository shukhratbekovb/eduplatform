from dataclasses import dataclass, field
from uuid import UUID, uuid4

from src.domain.shared.events import DomainEvent


@dataclass
class Entity:
    """Базовая сущность с идентификатором."""
    id: UUID = field(default_factory=uuid4)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return False
        return self.id == other.id

    def __hash__(self) -> int:
        return hash(self.id)


@dataclass
class AggregateRoot(Entity):
    """Корень агрегата — накапливает доменные события."""
    _events: list[DomainEvent] = field(default_factory=list, init=False, repr=False)

    def add_event(self, event: DomainEvent) -> None:
        self._events.append(event)

    def pull_events(self) -> list[DomainEvent]:
        """Забирает и очищает список событий."""
        events, self._events = self._events, []
        return events

    @property
    def domain_events(self) -> list[DomainEvent]:
        return list(self._events)
