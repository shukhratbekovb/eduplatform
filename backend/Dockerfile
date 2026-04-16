# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.13-slim AS builder

WORKDIR /app

# Системные зависимости (gcc для asyncpg, libmagic для python-magic)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev libmagic1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir poetry==1.8.*

# Копируем манифесты отдельно — кэшируем слой зависимостей
COPY pyproject.toml poetry.lock ./

RUN pip install --no-cache-dir greenlet --no-binary greenlet \
    && poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.13-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Переносим установленные пакеты из builder
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Исходники
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini .

# Непривилегированный пользователь
RUN useradd -m -u 1001 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# Переопределяется в docker-compose для worker / beat
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
