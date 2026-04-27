"""Сервис хеширования и верификации паролей.

Обеспечивает безопасное хранение паролей пользователей с использованием
алгоритма bcrypt. Все пароли хешируются перед сохранением в базу данных,
а верификация происходит путём сравнения хеша.

Функции:
    - hash_password: хеширование пароля с автогенерацией соли.
    - verify_password: проверка соответствия пароля хешу.

Example:
    >>> from src.infrastructure.services.password_service import (
    ...     hash_password, verify_password,
    ... )
    >>> hashed = hash_password("password123")
    >>> assert verify_password("password123", hashed) is True
    >>> assert verify_password("wrong", hashed) is False
"""

import bcrypt as _bcrypt


def hash_password(plain: str) -> str:
    """Хеширует пароль с использованием bcrypt.

    Генерирует криптографическую соль и создаёт bcrypt-хеш пароля.
    Результат безопасен для хранения в базе данных.

    Args:
        plain: Пароль в открытом виде для хеширования.

    Returns:
        str: Bcrypt-хеш пароля в виде строки (включает соль).

    Example:
        >>> hashed = hash_password("SecurePass123!")
        >>> print(hashed)  # "$2b$12$..."
    """
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Проверяет соответствие пароля сохранённому хешу.

    Сравнивает пароль в открытом виде с bcrypt-хешем. Устойчива
    к timing-атакам благодаря использованию bcrypt.checkpw.

    Args:
        plain: Пароль в открытом виде для проверки.
        hashed: Bcrypt-хеш пароля из базы данных.

    Returns:
        bool: True, если пароль совпадает с хешем; False в противном случае.
            Возвращает False при любых ошибках декодирования.

    Example:
        >>> hashed = hash_password("MyPassword")
        >>> verify_password("MyPassword", hashed)
        True
        >>> verify_password("WrongPassword", hashed)
        False
    """
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False
