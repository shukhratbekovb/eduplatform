from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
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
