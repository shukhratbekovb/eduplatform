"""Абстрактные интерфейсы репозиториев (порты) для всех агрегатов.

Этот модуль определяет абстрактные интерфейсы репозиториев согласно
паттерну Ports & Adapters (Гексагональная архитектура). Интерфейсы
находятся в слое приложения (Application Layer) и определяют контракт,
который должен реализовать инфраструктурный слой (Infrastructure Layer).

Каждый репозиторий предоставляет базовые CRUD-операции для соответствующего
агрегата: получение по ID, сохранение (create/update) и листинг
с фильтрацией и пагинацией.

Модуль также содержит generic-класс Page[T] для пагинированных результатов.

Секции:
    - Auth: UserRepository
    - LMS: StudentRepository, DirectionRepository, SubjectRepository,
      RoomRepository, GroupRepository, LessonRepository, PaymentRepository
    - CRM: FunnelRepository, StageRepository, LeadRepository, CrmTaskRepository
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar
from uuid import UUID

from src.domain.auth.entities import User
from src.domain.lms.entities import (
    Direction,
    Group,
    Lesson,
    Payment,
    Room,
    Student,
    Subject,
)
from src.domain.crm.entities import CrmTask, Funnel, Lead, Stage

T = TypeVar("T")


@dataclass
class Page(Generic[T]):
    """Контейнер для пагинированных результатов.

    Используется всеми методами list() репозиториев для возврата
    страницы результатов вместе с метаинформацией о пагинации.

    Attributes:
        items: Список элементов текущей страницы.
        total: Общее количество элементов (без пагинации).
        page: Номер текущей страницы (начиная с 1).
        page_size: Размер страницы (количество элементов на странице).

    Example:
        >>> page = Page(items=[s1, s2], total=50, page=1, page_size=20)
        >>> page.pages
        3
    """

    items: list[T]
    total: int
    page: int
    page_size: int

    @property
    def pages(self) -> int:
        """Вычисляет общее количество страниц.

        Returns:
            int: Количество страниц (округление вверх).
        """
        return (self.total + self.page_size - 1) // self.page_size


# ─── Auth ───────────────────────────────────────────────────────────────────

class UserRepository(ABC):
    """Абстрактный репозиторий для агрегата User.

    Определяет контракт для операций с учётными записями
    пользователей: поиск по ID, по email, сохранение
    и листинг с фильтрацией.
    """

    @abstractmethod
    async def get_by_id(self, user_id: UUID) -> User | None:
        """Получает пользователя по уникальному идентификатору.

        Args:
            user_id: UUID пользователя.

        Returns:
            User | None: Сущность пользователя или None, если не найден.
        """
        ...

    @abstractmethod
    async def get_by_email(self, email: str) -> User | None:
        """Получает пользователя по адресу электронной почты.

        Args:
            email: Адрес электронной почты для поиска.

        Returns:
            User | None: Сущность пользователя или None, если не найден.
        """
        ...

    @abstractmethod
    async def save(self, user: User) -> None:
        """Сохраняет (создаёт или обновляет) пользователя.

        При совпадении ID выполняет обновление существующей записи,
        иначе — создание новой.

        Args:
            user: Доменная сущность пользователя для сохранения.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        role: str | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[User]:
        """Возвращает пагинированный список пользователей.

        Args:
            role: Фильтр по роли (опционально).
            is_active: Фильтр по активности (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице.

        Returns:
            Page[User]: Пагинированный результат.
        """
        ...


# ─── LMS ────────────────────────────────────────────────────────────────────

class StudentRepository(ABC):
    """Абстрактный репозиторий для агрегата Student.

    Определяет контракт для операций со студентами: CRUD,
    поиск по user_id, поиск по группе, листинг с фильтрацией.
    """

    @abstractmethod
    async def get_by_id(self, student_id: UUID) -> Student | None:
        """Получает студента по уникальному идентификатору.

        Args:
            student_id: UUID студента.

        Returns:
            Student | None: Сущность студента или None, если не найден.
        """
        ...

    @abstractmethod
    async def get_by_user_id(self, user_id: UUID) -> Student | None:
        """Получает студента по идентификатору связанной учётной записи User.

        Args:
            user_id: UUID учётной записи пользователя.

        Returns:
            Student | None: Сущность студента или None, если профиль
                студента не создан для данного пользователя.
        """
        ...

    @abstractmethod
    async def save(self, student: Student) -> None:
        """Сохраняет (создаёт или обновляет) студента.

        Args:
            student: Доменная сущность студента для сохранения.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        direction_id: UUID | None = None,
        risk_level: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Student]:
        """Возвращает пагинированный список студентов.

        Args:
            direction_id: Фильтр по направлению обучения (опционально).
            risk_level: Фильтр по уровню риска отчисления (опционально).
            search: Текстовый поиск по имени/коду (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице.

        Returns:
            Page[Student]: Пагинированный результат.
        """
        ...

    @abstractmethod
    async def get_by_group(self, group_id: UUID) -> list[Student]:
        """Получает всех студентов, зачисленных в указанную группу.

        Args:
            group_id: UUID группы.

        Returns:
            list[Student]: Список студентов группы.
        """
        ...


class DirectionRepository(ABC):
    """Абстрактный репозиторий для агрегата Direction (направление обучения).

    Определяет контракт для операций с направлениями: получение по ID,
    сохранение и листинг с фильтрацией по активности.
    """

    @abstractmethod
    async def get_by_id(self, direction_id: UUID) -> Direction | None:
        """Получает направление по уникальному идентификатору.

        Args:
            direction_id: UUID направления.

        Returns:
            Direction | None: Сущность направления или None.
        """
        ...

    @abstractmethod
    async def save(self, direction: Direction) -> None:
        """Сохраняет (создаёт или обновляет) направление.

        Args:
            direction: Доменная сущность направления.
        """
        ...

    @abstractmethod
    async def list(self, *, is_active: bool | None = None) -> list[Direction]:
        """Возвращает список направлений обучения.

        Args:
            is_active: Фильтр по активности (опционально).

        Returns:
            list[Direction]: Список направлений.
        """
        ...


class SubjectRepository(ABC):
    """Абстрактный репозиторий для агрегата Subject (учебный предмет).

    Определяет контракт для операций с предметами: получение по ID,
    сохранение и листинг с фильтрацией по направлению, преподавателю
    и активности.
    """

    @abstractmethod
    async def get_by_id(self, subject_id: UUID) -> Subject | None:
        """Получает предмет по уникальному идентификатору.

        Args:
            subject_id: UUID предмета.

        Returns:
            Subject | None: Сущность предмета или None.
        """
        ...

    @abstractmethod
    async def save(self, subject: Subject) -> None:
        """Сохраняет (создаёт или обновляет) предмет.

        Args:
            subject: Доменная сущность предмета.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        direction_id: UUID | None = None,
        teacher_id: UUID | None = None,
        is_active: bool | None = None,
    ) -> list[Subject]:
        """Возвращает список предметов с фильтрацией.

        Args:
            direction_id: Фильтр по направлению (опционально).
            teacher_id: Фильтр по преподавателю (опционально).
            is_active: Фильтр по активности (опционально).

        Returns:
            list[Subject]: Список предметов.
        """
        ...


class RoomRepository(ABC):
    """Абстрактный репозиторий для агрегата Room (учебный кабинет).

    Определяет контракт для операций с кабинетами.
    """

    @abstractmethod
    async def get_by_id(self, room_id: UUID) -> Room | None:
        """Получает кабинет по уникальному идентификатору.

        Args:
            room_id: UUID кабинета.

        Returns:
            Room | None: Сущность кабинета или None.
        """
        ...

    @abstractmethod
    async def save(self, room: Room) -> None:
        """Сохраняет (создаёт или обновляет) кабинет.

        Args:
            room: Доменная сущность кабинета.
        """
        ...

    @abstractmethod
    async def list(self, *, is_active: bool | None = None) -> list[Room]:
        """Возвращает список кабинетов.

        Args:
            is_active: Фильтр по активности (опционально).

        Returns:
            list[Room]: Список кабинетов.
        """
        ...


class GroupRepository(ABC):
    """Абстрактный репозиторий для агрегата Group (учебная группа).

    Определяет контракт для операций с группами: CRUD
    и листинг с фильтрацией и пагинацией.
    """

    @abstractmethod
    async def get_by_id(self, group_id: UUID) -> Group | None:
        """Получает группу по уникальному идентификатору.

        Args:
            group_id: UUID группы.

        Returns:
            Group | None: Сущность группы или None.
        """
        ...

    @abstractmethod
    async def save(self, group: Group) -> None:
        """Сохраняет (создаёт или обновляет) группу.

        Args:
            group: Доменная сущность группы.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        subject_id: UUID | None = None,
        teacher_id: UUID | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Group]:
        """Возвращает пагинированный список групп.

        Args:
            subject_id: Фильтр по предмету (опционально).
            teacher_id: Фильтр по преподавателю (опционально).
            is_active: Фильтр по активности (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице.

        Returns:
            Page[Group]: Пагинированный результат.
        """
        ...


class LessonRepository(ABC):
    """Абстрактный репозиторий для агрегата Lesson (урок).

    Определяет контракт для операций с уроками: CRUD
    и листинг с фильтрацией по группе, преподавателю,
    статусу и диапазону дат.
    """

    @abstractmethod
    async def get_by_id(self, lesson_id: UUID) -> Lesson | None:
        """Получает урок по уникальному идентификатору.

        Args:
            lesson_id: UUID урока.

        Returns:
            Lesson | None: Сущность урока или None.
        """
        ...

    @abstractmethod
    async def save(self, lesson: Lesson) -> None:
        """Сохраняет (создаёт или обновляет) урок.

        Args:
            lesson: Доменная сущность урока.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        group_id: UUID | None = None,
        teacher_id: UUID | None = None,
        status: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Lesson]:
        """Возвращает пагинированный список уроков.

        Args:
            group_id: Фильтр по группе (опционально).
            teacher_id: Фильтр по преподавателю (опционально).
            status: Фильтр по статусу — "scheduled", "completed",
                "cancelled" (опционально).
            date_from: Начало диапазона дат в формате ISO (опционально).
            date_to: Конец диапазона дат в формате ISO (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице.

        Returns:
            Page[Lesson]: Пагинированный результат.
        """
        ...


class PaymentRepository(ABC):
    """Абстрактный репозиторий для агрегата Payment (платёж).

    Определяет контракт для операций с платежами: CRUD
    и листинг с фильтрацией по студенту и статусу.
    """

    @abstractmethod
    async def get_by_id(self, payment_id: UUID) -> Payment | None:
        """Получает платёж по уникальному идентификатору.

        Args:
            payment_id: UUID платежа.

        Returns:
            Payment | None: Сущность платежа или None.
        """
        ...

    @abstractmethod
    async def save(self, payment: Payment) -> None:
        """Сохраняет (создаёт или обновляет) платёж.

        Args:
            payment: Доменная сущность платежа.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        student_id: UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Payment]:
        """Возвращает пагинированный список платежей.

        Args:
            student_id: Фильтр по студенту (опционально).
            status: Фильтр по статусу — "paid", "pending",
                "overdue" (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице.

        Returns:
            Page[Payment]: Пагинированный результат.
        """
        ...


# ─── CRM ────────────────────────────────────────────────────────────────────

class FunnelRepository(ABC):
    """Абстрактный репозиторий для агрегата Funnel (воронка продаж CRM).

    Определяет контракт для операций с воронками: получение по ID,
    сохранение и листинг с фильтрацией по архивному статусу.
    """

    @abstractmethod
    async def get_by_id(self, funnel_id: UUID) -> Funnel | None:
        """Получает воронку по уникальному идентификатору.

        Args:
            funnel_id: UUID воронки.

        Returns:
            Funnel | None: Сущность воронки или None.
        """
        ...

    @abstractmethod
    async def save(self, funnel: Funnel) -> None:
        """Сохраняет (создаёт или обновляет) воронку.

        Args:
            funnel: Доменная сущность воронки.
        """
        ...

    @abstractmethod
    async def list(self, *, is_archived: bool | None = None) -> list[Funnel]:
        """Возвращает список воронок продаж.

        Args:
            is_archived: Фильтр по архивному статусу (опционально).

        Returns:
            list[Funnel]: Список воронок.
        """
        ...


class StageRepository(ABC):
    """Абстрактный репозиторий для агрегата Stage (этап воронки CRM).

    Определяет контракт для операций с этапами: получение по ID,
    сохранение и получение всех этапов конкретной воронки.
    """

    @abstractmethod
    async def get_by_id(self, stage_id: UUID) -> Stage | None:
        """Получает этап воронки по уникальному идентификатору.

        Args:
            stage_id: UUID этапа.

        Returns:
            Stage | None: Сущность этапа или None.
        """
        ...

    @abstractmethod
    async def save(self, stage: Stage) -> None:
        """Сохраняет (создаёт или обновляет) этап воронки.

        Args:
            stage: Доменная сущность этапа.
        """
        ...

    @abstractmethod
    async def get_by_funnel(self, funnel_id: UUID) -> list[Stage]:
        """Получает все этапы указанной воронки.

        Args:
            funnel_id: UUID воронки.

        Returns:
            list[Stage]: Список этапов воронки (отсортированных
                по порядку).
        """
        ...


class LeadRepository(ABC):
    """Абстрактный репозиторий для агрегата Lead (лид CRM).

    Определяет контракт для операций с лидами: CRUD и листинг
    с фильтрацией по воронке, этапу, ответственному менеджеру,
    статусу и текстовому поиску.
    """

    @abstractmethod
    async def get_by_id(self, lead_id: UUID) -> Lead | None:
        """Получает лид по уникальному идентификатору.

        Args:
            lead_id: UUID лида.

        Returns:
            Lead | None: Сущность лида или None.
        """
        ...

    @abstractmethod
    async def save(self, lead: Lead) -> None:
        """Сохраняет (создаёт или обновляет) лид.

        Args:
            lead: Доменная сущность лида.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        funnel_id: UUID | None = None,
        stage_id: UUID | None = None,
        assigned_to: UUID | None = None,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[Lead]:
        """Возвращает пагинированный список лидов.

        Args:
            funnel_id: Фильтр по воронке (опционально).
            stage_id: Фильтр по этапу воронки (опционально).
            assigned_to: Фильтр по ответственному менеджеру (опционально).
            status: Фильтр по статусу лида (опционально).
            search: Текстовый поиск по имени/телефону (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице.

        Returns:
            Page[Lead]: Пагинированный результат.
        """
        ...


class CrmTaskRepository(ABC):
    """Абстрактный репозиторий для агрегата CrmTask (задача CRM).

    Определяет контракт для операций с задачами CRM: CRUD
    и листинг с фильтрацией по ответственному, связанному лиду
    и статусу.
    """

    @abstractmethod
    async def get_by_id(self, task_id: UUID) -> CrmTask | None:
        """Получает задачу CRM по уникальному идентификатору.

        Args:
            task_id: UUID задачи.

        Returns:
            CrmTask | None: Сущность задачи или None.
        """
        ...

    @abstractmethod
    async def save(self, task: CrmTask) -> None:
        """Сохраняет (создаёт или обновляет) задачу CRM.

        Args:
            task: Доменная сущность задачи.
        """
        ...

    @abstractmethod
    async def list(
        self,
        *,
        assigned_to: UUID | None = None,
        lead_id: UUID | None = None,
        status: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Page[CrmTask]:
        """Возвращает пагинированный список задач CRM.

        Args:
            assigned_to: Фильтр по ответственному (опционально).
            lead_id: Фильтр по связанному лиду (опционально).
            status: Фильтр по статусу задачи (опционально).
            page: Номер страницы (начиная с 1).
            page_size: Количество записей на странице.

        Returns:
            Page[CrmTask]: Пагинированный результат.
        """
        ...
