"""Конфигурация приложения EduPlatform через переменные окружения.

Модуль определяет класс ``Settings`` на базе pydantic-settings, который
загружает конфигурацию из файла ``.env`` и переменных окружения.
Единственный экземпляр ``settings`` создаётся на уровне модуля и
импортируется всеми компонентами системы.

Группы настроек:
    - **App**: режим окружения, debug, разрешённые CORS-домены.
    - **Auth**: JWT-секрет, время жизни токенов, алгоритм подписи.
    - **Database**: URL подключения к PostgreSQL через asyncpg.
    - **Redis**: URL для кэширования и бэкенда результатов Celery.
    - **Celery**: URL брокера (RabbitMQ) и бэкенда результатов.
    - **GCS**: Google Cloud Storage (bucket, путь к credentials).
    - **Sentry**: DSN для мониторинга ошибок (опционально).

Переменные окружения имеют приоритет над значениями из .env файла.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки приложения EduPlatform.

    Загружает параметры из .env файла и переменных окружения.
    Все параметры имеют значения по умолчанию для локальной разработки.
    В production переопределяются через переменные окружения Docker.

    Attributes:
        APP_ENV: Режим окружения (development/production/test).
        DEBUG: Включение отладочного режима (echo SQL-запросов и др.).
        ALLOWED_ORIGINS: Список разрешённых CORS-доменов для фронтендов.
        SECRET_KEY: Секретный ключ для подписи JWT-токенов (минимум 32 символа).
        ACCESS_TOKEN_EXPIRE_MINUTES: Время жизни access-токена в минутах.
        REFRESH_TOKEN_EXPIRE_DAYS: Время жизни refresh-токена в днях.
        ALGORITHM: Алгоритм подписи JWT (по умолчанию HS256).
        DATABASE_URL: URL подключения к PostgreSQL через asyncpg.
        REDIS_URL: URL подключения к Redis для кэширования.
        CACHE_TTL_SECONDS: Время жизни кэша в секундах (по умолчанию 300).
        CELERY_BROKER_URL: URL брокера сообщений Celery (RabbitMQ).
        CELERY_RESULT_BACKEND: URL бэкенда результатов Celery (Redis).
        GCS_BUCKET_NAME: Имя бакета Google Cloud Storage.
        GCS_CREDENTIALS_JSON: Путь к файлу credentials GCS.
        SENTRY_DSN: DSN для Sentry (None = отключён).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ───────────────────────────────────────────────────────────────────
    APP_ENV: str = "development"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ]

    # ── Auth ──────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-min-32-chars!!"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://edu:edu@localhost:5432/eduplatform"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 300  # 5 min default

    # ── Celery ────────────────────────────────────────────────────────────────
    CELERY_BROKER_URL: str = "amqp://edu:edu@localhost:5672//"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ── Google Cloud Storage ─────────────────────────────────────────────────
    GCS_BUCKET_NAME: str = "eduplatform"
    GCS_CREDENTIALS_JSON: str | None = "/app/gcp_keys.json"

    # ── Sentry ────────────────────────────────────────────────────────────────
    SENTRY_DSN: str | None = None


settings = Settings()
