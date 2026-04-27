"""Политики домена аутентификации — бизнес-правила управления пользователями.

Этот модуль содержит доменные политики (Domain Policies), определяющие
бизнес-правила для создания пользователей и валидации паролей.

Политики отделены от сущностей, чтобы инкапсулировать сложную бизнес-логику
и обеспечить возможность повторного использования правил.

Классы:
    UserCreationPolicy: Определяет иерархию ролей и права на создание пользователей.
    PasswordPolicy: Валидация надёжности пароля в стиле Apple.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from src.domain.auth.specifications import PASSWORD_RULES, STRONG_PASSWORD_SPEC

if TYPE_CHECKING:
    from src.domain.auth.entities import User, UserRole


class UserCreationPolicy:
    """Политика создания пользователей на основе иерархии ролей.

    Определяет, какие роли может создавать пользователь с определённой ролью.
    Реализует принцип наименьших привилегий: каждая роль может создавать
    только те роли, которые ниже неё в иерархии.

    Attributes:
        ROLE_HIERARCHY: Словарь, определяющий допустимые роли для создания.
            Ключ — роль создателя, значение — множество допустимых ролей.

    Example:
        >>> from src.domain.auth.entities import User, UserRole
        >>> director = User.create(name="Директор", email="d@edu.uz",
        ...     password_hash="...", role=UserRole.DIRECTOR)
        >>> UserCreationPolicy.can_create(director, UserRole.TEACHER)
        True
        >>> UserCreationPolicy.can_create(director, UserRole.STUDENT)
        True
    """

    ROLE_HIERARCHY: dict[str, set[str]] = {
        "director": {"director", "mup", "teacher", "sales_manager", "cashier", "student"},
        "mup": {"teacher", "student"},
    }

    @classmethod
    def can_create(cls, creator: User, target_role: UserRole) -> bool:
        """Проверяет, может ли пользователь создать учётную запись с указанной ролью.

        Args:
            creator: Пользователь, инициирующий создание (должен иметь
                соответствующую роль).
            target_role: Роль, которую нужно назначить новому пользователю.

        Returns:
            bool: True, если создание разрешено иерархией ролей.
                False, если роль создателя не имеет прав на создание
                указанной целевой роли.
        """
        allowed = cls.ROLE_HIERARCHY.get(creator.role.value, set())
        return target_role.value in allowed


class PasswordPolicy:
    """Политика валидации надёжности пароля в стиле Apple.

    Использует паттерн Specification для составной проверки пароля.
    Пароль считается надёжным, если удовлетворяет ВСЕМ спецификациям:
    минимальная длина, наличие заглавных/строчных букв, цифр и спецсимволов.

    Спецификации определены в модуле ``specifications`` и комбинируются
    через оператор ``&`` (логическое И).
    """

    @staticmethod
    def is_strong(password: str) -> bool:
        """Проверяет, является ли пароль надёжным.

        Args:
            password: Пароль для проверки.

        Returns:
            bool: True, если пароль удовлетворяет всем требованиям
                надёжности (длина >= 8, заглавная буква, строчная буква,
                цифра, спецсимвол).
        """
        return STRONG_PASSWORD_SPEC.is_satisfied_by(password)

    @staticmethod
    def validate(password: str) -> list[str]:
        """Возвращает список невыполненных требований к паролю.

        Проверяет пароль по каждому правилу отдельно и собирает
        сообщения об ошибках для невыполненных требований.

        Args:
            password: Пароль для валидации.

        Returns:
            list[str]: Список сообщений о невыполненных требованиях.
                Пустой список означает, что пароль валиден.

        Example:
            >>> PasswordPolicy.validate("weak")
            ['Минимум 8 символов', 'Минимум одна заглавная буква (A-Z)', ...]
            >>> PasswordPolicy.validate("Strong1Pass!")
            []
        """
        return [message for spec, message in PASSWORD_RULES if not spec.is_satisfied_by(password)]
