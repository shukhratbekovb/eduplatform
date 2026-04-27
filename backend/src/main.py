"""Точка входа FastAPI-приложения EduPlatform.

Модуль выполняет:
    1. Настройку структурированного логирования (structlog) — JSON в production,
       цветной вывод в development.
    2. Инициализацию Sentry для мониторинга ошибок (если указан SENTRY_DSN).
    3. Создание экземпляра FastAPI с CORS, middleware логирования запросов
       и нормализацией trailing slashes.
    4. Предзагрузку ML-модели риска в память при старте (lifespan).
    5. Подключение маршрутов API v1 и health-check endpoint.

Запуск:
    .. code-block:: bash

        uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
"""

import time
import uuid as _uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import sentry_sdk
import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings

# ── structlog configuration ───────────────────────────────────────────────────

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.APP_ENV == "development" else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

log = structlog.get_logger()


# ── lifespan ──────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Управление жизненным циклом FastAPI-приложения.

    При старте:
        - Логирует режим окружения (APP_ENV).
        - Предзагружает ML-модель риска в память через RiskPredictor.get_instance().
          При ошибке загрузки (файл не найден) логирует warning, но не прерывает старт.

    При остановке:
        - Логирует shutdown.

    Args:
        app: Экземпляр FastAPI-приложения.

    Yields:
        None: Контроль передаётся приложению между startup и shutdown.
    """
    log.info("startup", env=settings.APP_ENV)
    # Pre-load ML risk model into memory
    try:
        from src.ml.predictor import RiskPredictor

        RiskPredictor.get_instance()
        log.info("ml_model_loaded", model="risk_scoring")
    except Exception as e:
        log.warning("ml_model_load_failed", error=str(e))
    yield
    log.info("shutdown")


# ── app factory ───────────────────────────────────────────────────────────────


def create_app() -> FastAPI:
    """Фабрика FastAPI-приложения.

    Создаёт и настраивает экземпляр FastAPI:
        1. Инициализирует Sentry (если задан SENTRY_DSN).
        2. Настраивает CORS для фронтенд-приложений (CRM, Logbook, Student Portal).
        3. Добавляет middleware нормализации trailing slashes.
        4. Добавляет middleware логирования HTTP-запросов (method, path, status, ms).
        5. Подключает маршруты API v1 с префиксом ``/api/v1``.
        6. Регистрирует health-check endpoint ``GET /health``.

    Документация (Swagger/ReDoc) отключена в production-режиме.

    Returns:
        Настроенный экземпляр FastAPI, готовый к запуску через uvicorn.
    """
    # Sentry
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.APP_ENV,
            traces_sample_rate=0.1,
        )

    app = FastAPI(
        title="EduPlatform API",
        version="0.1.0",
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
        lifespan=lifespan,
        redirect_slashes=False,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Normalize slashes: strip trailing slash so routes without "/" also work
    @app.middleware("http")
    async def normalize_slash(request: Request, call_next) -> Response:  # type: ignore[type-arg]
        """Middleware нормализации URL: убирает trailing slash.

        Позволяет обращаться к ``/api/v1/users`` и ``/api/v1/users/``
        одинаково, перенаправляя оба на один обработчик.

        Args:
            request: Входящий HTTP-запрос.
            call_next: Следующий обработчик в цепочке middleware.

        Returns:
            HTTP-ответ от следующего обработчика.
        """
        path = request.scope["path"]
        if path != "/" and path.endswith("/"):
            request.scope["path"] = path.rstrip("/")
        response: Response = await call_next(request)
        return response

    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next) -> Response:  # type: ignore[type-arg]
        """Middleware структурированного логирования HTTP-запросов.

        Для каждого запроса:
            1. Генерирует уникальный request_id (8 символов UUID).
            2. Привязывает request_id к контексту structlog.
            3. Замеряет время выполнения.
            4. Логирует метод, путь, статус и время (мс).
            5. Добавляет заголовок X-Request-ID в ответ.

        Args:
            request: Входящий HTTP-запрос.
            call_next: Следующий обработчик в цепочке middleware.

        Returns:
            HTTP-ответ с добавленным заголовком X-Request-ID.
        """
        request_id = str(_uuid.uuid4())[:8]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response: Response = await call_next(request)
        elapsed = round((time.perf_counter() - start) * 1000, 2)

        log.info(
            "http_request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            ms=elapsed,
        )
        response.headers["X-Request-ID"] = request_id
        return response

    # Routers
    from src.api.v1.router import router as v1_router

    app.include_router(v1_router, prefix="/api/v1")

    # Health check
    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        """Проверка работоспособности сервиса.

        Используется Docker healthcheck и балансировщиком нагрузки
        для определения доступности API.

        Returns:
            Словарь {"status": "ok", "env": <APP_ENV>}.
        """
        return {"status": "ok", "env": settings.APP_ENV}

    return app


app = create_app()
