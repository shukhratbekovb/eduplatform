.PHONY: help dev build up down logs shell migrate migrate-down migrate-history \
        test test-unit test-integration test-cov lint format typecheck clean seed

# ── Config ────────────────────────────────────────────────────────────────────
PYTHON        := poetry run python3
PYTEST        := poetry run pytest
ALEMBIC       := poetry run alembic
RUFF          := poetry run ruff
MYPY          := poetry run mypy
DC            := docker compose
DC_FILE       := ../docker-compose.yml

help:  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── Local dev (Docker Compose) ────────────────────────────────────────────────

dev: up  ## Alias for `up`

up:  ## Start all services (backend, db, redis, minio, rabbitmq)
	$(DC) -f $(DC_FILE) up -d

build:  ## Rebuild Docker images
	$(DC) -f $(DC_FILE) build

down:  ## Stop all services
	$(DC) -f $(DC_FILE) down

logs:  ## Tail logs from all services
	$(DC) -f $(DC_FILE) logs -f

shell:  ## Open a shell inside the backend container
	$(DC) -f $(DC_FILE) exec backend bash

# ── Database migrations ───────────────────────────────────────────────────────

migrate:  ## Run all pending Alembic migrations
	$(ALEMBIC) upgrade head

migrate-down:  ## Roll back the last Alembic migration
	$(ALEMBIC) downgrade -1

migrate-create:  ## Create a new migration: make migrate-create MSG="add users table"
	$(ALEMBIC) revision --autogenerate -m "$(MSG)"

migrate-history:  ## Show migration history
	$(ALEMBIC) history --verbose

migrate-current:  ## Show current DB revision
	$(ALEMBIC) current

# ── Tests ─────────────────────────────────────────────────────────────────────

test:  ## Run all tests
	$(PYTEST)

test-unit:  ## Run unit tests only
	$(PYTEST) tests/unit/ -v

test-integration:  ## Run integration tests only (requires DB)
	$(PYTEST) tests/integration/ -v

test-cov:  ## Run tests with coverage report
	$(PYTEST) --cov=src --cov-report=term-missing --cov-report=html:htmlcov

test-fast:  ## Run unit tests only (fast, no DB)
	$(PYTEST) tests/unit/ -q

test-k:  ## Run tests matching a keyword: make test-k K=login
	$(PYTEST) -k "$(K)"

# ── Code quality ──────────────────────────────────────────────────────────────

lint:  ## Lint with ruff
	$(RUFF) check src/ tests/

format:  ## Format code with ruff
	$(RUFF) format src/ tests/

lint-fix:  ## Auto-fix lint issues
	$(RUFF) check --fix src/ tests/

typecheck:  ## Run mypy type checker
	$(MYPY) src/ --ignore-missing-imports

# ── Utilities ─────────────────────────────────────────────────────────────────

install:  ## Install dependencies via Poetry
	poetry install

clean:  ## Remove cache files
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	rm -rf .pytest_cache htmlcov .mypy_cache .ruff_cache

seed:  ## Seed the DB with initial data (director account)
	$(PYTHON) -m scripts.seed

# ── Celery ────────────────────────────────────────────────────────────────────

worker:  ## Start Celery worker (local)
	poetry run celery -A src.tasks.celery_app worker --loglevel=info

beat:  ## Start Celery Beat scheduler (local)
	poetry run celery -A src.tasks.celery_app beat --loglevel=info
