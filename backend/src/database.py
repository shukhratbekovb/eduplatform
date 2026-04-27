"""Настройка асинхронного подключения к PostgreSQL через SQLAlchemy 2.

Модуль создаёт:
    - ``engine`` — асинхронный движок SQLAlchemy с пулом соединений
      (pool_size=10, max_overflow=20, pool_pre_ping=True).
    - ``async_session_factory`` — фабрика асинхронных сессий с
      expire_on_commit=False (объекты остаются доступны после commit).
    - ``Base`` — декларативный базовый класс для всех ORM-моделей.
    - ``get_db()`` — FastAPI-зависимость для получения сессии БД в
      обработчиках запросов.

Конфигурация подключения берётся из ``settings.DATABASE_URL``.
При DEBUG=True включается echo SQL-запросов в лог.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Базовый класс для всех SQLAlchemy ORM-моделей.

    Все модели приложения (UserModel, StudentModel, LessonModel и др.)
    наследуются от этого класса, что обеспечивает единый реестр метаданных
    и автоматическое обнаружение таблиц для create_all/drop_all.
    """


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI-зависимость для получения асинхронной сессии БД.

    Создаёт сессию, передаёт её в обработчик запроса через yield,
    после чего коммитит транзакцию. При возникновении исключения
    откатывает транзакцию и пробрасывает ошибку.

    Yields:
        AsyncSession: Асинхронная сессия SQLAlchemy, привязанная
        к текущему запросу.

    Raises:
        Exception: Любое исключение из обработчика пробрасывается
        после отката транзакции.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
