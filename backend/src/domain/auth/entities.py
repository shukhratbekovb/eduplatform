"""Сущности домена аутентификации.

Этот модуль определяет основные доменные сущности для подсистемы
аутентификации и авторизации: перечисление ролей пользователей
и агрегат User (пользователь системы).

Модуль является частью доменного слоя (Domain Layer) согласно
архитектуре DDD и не зависит от инфраструктурных деталей.

Типичное использование:
    user = User.create(
        name="Камалов Бахтияр",
        email="director@edu.uz",
        password_hash=hashed,
        role=UserRole.DIRECTOR,
    )
"""

from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID

from src.domain.shared.entity import AggregateRoot
from src.domain.shared.value_objects import Email


class UserRole(StrEnum):
    """Перечисление ролей пользователей в системе.

    Определяет все возможные роли, которые может иметь пользователь
    в образовательной платформе. Роль определяет уровень доступа
    и набор доступных функций.

    Attributes:
        DIRECTOR: Директор учебного центра — полный доступ ко всем модулям.
        MUP: Менеджер учебного процесса — управление группами, расписанием,
            одобрение запросов преподавателей.
        TEACHER: Преподаватель — проведение уроков, выставление оценок,
            посещаемости, домашних заданий.
        SALES_MANAGER: Менеджер по продажам — работа с CRM, воронками, лидами.
        CASHIER: Кассир — управление платежами, финансовые отчёты.
        STUDENT: Студент — доступ к студенческому порталу (расписание,
            оценки, домашние задания, геймификация).
    """

    DIRECTOR = "director"
    MUP = "mup"
    TEACHER = "teacher"
    SALES_MANAGER = "sales_manager"
    CASHIER = "cashier"
    STUDENT = "student"


@dataclass
class User(AggregateRoot):
    """Сущность пользователя системы (корень агрегата).

    Представляет учётную запись пользователя в образовательной платформе.
    Является корнем агрегата (AggregateRoot), что позволяет накапливать
    доменные события при изменении состояния.

    Каждый пользователь имеет уникальный email, роль и может быть
    деактивирован без удаления из системы (soft delete).

    Attributes:
        email: Электронная почта пользователя (value object Email).
        password_hash: Хэш пароля (bcrypt). Никогда не хранится в открытом виде.
        name: Полное имя пользователя (ФИО).
        role: Роль пользователя в системе (UserRole).
        avatar_url: URL аватара пользователя (опционально).
        is_active: Флаг активности учётной записи.

    Example:
        >>> user = User.create(
        ...     name="Рахимов Дилшод",
        ...     email="dilshod@edu.uz",
        ...     password_hash="$2b$12$...",
        ...     role=UserRole.TEACHER,
        ... )
        >>> user.is_staff()
        True
        >>> user.deactivate()
        >>> user.is_active
        False
    """

    email: Email = field(default_factory=lambda: Email("placeholder@example.com"))
    password_hash: str = ""
    name: str = ""
    role: UserRole = UserRole.TEACHER
    avatar_url: str | None = None
    is_active: bool = True

    @classmethod
    def create(
        cls,
        name: str,
        email: str,
        password_hash: str,
        role: UserRole,
        avatar_url: str | None = None,
    ) -> "User":
        """Фабричный метод создания нового пользователя.

        Создаёт экземпляр User с валидацией email через value object.

        Args:
            name: Полное имя пользователя (ФИО).
            email: Адрес электронной почты (будет валидирован).
            password_hash: Хэш пароля (bcrypt).
            role: Роль пользователя в системе.
            avatar_url: URL аватара (опционально).

        Returns:
            User: Новый экземпляр пользователя с уникальным UUID.

        Raises:
            ValueError: Если email не соответствует формату.
        """
        return cls(
            email=Email(email),
            password_hash=password_hash,
            name=name,
            role=role,
            avatar_url=avatar_url,
        )

    def deactivate(self) -> None:
        """Деактивирует учётную запись пользователя.

        После деактивации пользователь не сможет войти в систему.
        Данные сохраняются (soft delete).
        """
        self.is_active = False

    def change_role(self, new_role: UserRole) -> None:
        """Изменяет роль пользователя.

        Args:
            new_role: Новая роль для назначения.
        """
        self.role = new_role

    @property
    def email_str(self) -> str:
        """Возвращает email в виде строки.

        Returns:
            str: Строковое представление email-адреса.
        """
        return str(self.email)

    def is_staff(self) -> bool:
        """Проверяет, является ли пользователь сотрудником.

        Сотрудником считается любой пользователь, чья роль
        отличается от STUDENT (директор, МУП, преподаватель,
        менеджер по продажам, кассир).

        Returns:
            bool: True, если пользователь — сотрудник.
        """
        return self.role != UserRole.STUDENT
