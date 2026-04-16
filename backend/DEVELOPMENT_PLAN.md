# EduPlatform Backend — Development Plan

> FastAPI · Clean Architecture · PostgreSQL · Redis · Celery · RabbitMQ  
> Package manager: **Poetry**  
> Python: **3.12**

---

## 1. Структура проекта

```
backend/
├── pyproject.toml
├── poetry.lock
├── .env.example
├── alembic.ini
├── alembic/
│   ├── env.py
│   └── versions/
├── src/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app factory
│   ├── config.py                  # Settings (pydantic-settings)
│   ├── database.py                # SQLAlchemy async engine + session
│   ├── redis.py                   # Redis client
│   │
│   ├── domain/                    # Слой 1: Доменные сущности (чистый Python, 0 зависимостей)
│   │   ├── __init__.py
│   │   ├── shared/
│   │   │   ├── entity.py          # BaseEntity, AggregateRoot
│   │   │   ├── value_objects.py   # Email, Phone, Money, etc.
│   │   │   └── events.py          # DomainEvent base
│   │   ├── auth/
│   │   │   └── entities.py
│   │   ├── lms/
│   │   │   ├── student.py
│   │   │   ├── group.py
│   │   │   ├── lesson.py
│   │   │   ├── grade.py
│   │   │   ├── homework.py
│   │   │   ├── payment.py
│   │   │   └── events.py
│   │   ├── crm/
│   │   │   ├── lead.py
│   │   │   ├── funnel.py
│   │   │   ├── task.py
│   │   │   └── events.py
│   │   └── gamification/
│   │       ├── achievement.py
│   │       └── events.py
│   │
│   ├── application/               # Слой 2: Use Cases (бизнес-логика)
│   │   ├── __init__.py
│   │   ├── interfaces/            # Абстрактные репозитории и сервисы
│   │   │   ├── repositories.py
│   │   │   └── services.py
│   │   ├── auth/
│   │   │   ├── use_cases.py
│   │   │   └── schemas.py         # Pydantic In/Out DTOs
│   │   ├── lms/
│   │   │   ├── students/
│   │   │   │   ├── use_cases.py
│   │   │   │   └── schemas.py
│   │   │   ├── lessons/
│   │   │   │   ├── use_cases.py
│   │   │   │   └── schemas.py
│   │   │   ├── homework/
│   │   │   │   ├── use_cases.py
│   │   │   │   └── schemas.py
│   │   │   ├── analytics/
│   │   │   │   ├── use_cases.py
│   │   │   │   └── schemas.py
│   │   │   └── finance/
│   │   │       ├── use_cases.py
│   │   │       └── schemas.py
│   │   ├── crm/
│   │   │   ├── leads/
│   │   │   │   ├── use_cases.py
│   │   │   │   └── schemas.py
│   │   │   ├── funnels/
│   │   │   │   ├── use_cases.py
│   │   │   │   └── schemas.py
│   │   │   └── analytics/
│   │   │       ├── use_cases.py
│   │   │       └── schemas.py
│   │   └── student_portal/
│   │       ├── use_cases.py
│   │       └── schemas.py
│   │
│   ├── infrastructure/            # Слой 3: БД, кэш, внешние сервисы
│   │   ├── __init__.py
│   │   ├── persistence/
│   │   │   ├── models/            # SQLAlchemy ORM модели
│   │   │   │   ├── base.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── lms.py
│   │   │   │   ├── crm.py
│   │   │   │   └── gamification.py
│   │   │   └── repositories/      # Реализации репозиториев
│   │   │       ├── auth.py
│   │   │       ├── lms/
│   │   │       └── crm/
│   │   ├── cache/
│   │   │   ├── keys.py            # Константы ключей Redis
│   │   │   └── service.py         # CacheService обёртка
│   │   ├── workers/               # Celery задачи
│   │   │   ├── celery_app.py
│   │   │   ├── tasks/
│   │   │   │   ├── risk.py        # Ночной пересчёт риска
│   │   │   │   ├── salary.py      # Расчёт зарплат
│   │   │   │   └── notifications.py
│   │   │   └── schedules.py       # beat расписание
│   │   └── services/
│   │       ├── password.py        # bcrypt
│   │       ├── jwt.py             # python-jose
│   │       ├── file_storage.py    # S3 FileStorageService (aioboto3)
│   │       ├── file_validator.py  # MIME-тип, размер, расширение
│   │       └── event_bus.py       # Domain event dispatcher
│   │
│   └── api/                       # Слой 4: HTTP (FastAPI роутеры)
│       ├── __init__.py
│       ├── dependencies.py        # get_db, get_current_user, role guards
│       ├── exceptions.py          # HTTP exception handlers
│       ├── v1/
│       │   ├── __init__.py
│       │   ├── router.py          # Главный роутер (include all)
│       │   ├── auth.py
│       │   ├── lms/
│       │   │   ├── users.py
│       │   │   ├── directions.py
│       │   │   ├── subjects.py
│       │   │   ├── rooms.py
│       │   │   ├── groups.py
│       │   │   ├── enrollments.py
│       │   │   ├── lessons.py
│       │   │   ├── students.py
│       │   │   ├── homework.py
│       │   │   ├── late_requests.py
│       │   │   ├── tasks.py
│       │   │   ├── exams.py
│       │   │   ├── compensation.py
│       │   │   ├── finance.py
│       │   │   ├── analytics.py
│       │   │   └── reports.py
│       │   ├── crm/
│       │   │   ├── funnels.py
│       │   │   ├── stages.py
│       │   │   ├── custom_fields.py
│       │   │   ├── lead_sources.py
│       │   │   ├── leads.py
│       │   │   ├── tasks.py
│       │   │   └── analytics.py
│       │   └── student/
│       │       ├── dashboard.py
│       │       ├── schedule.py
│       │       ├── assignments.py
│       │       ├── materials.py
│       │       ├── achievements.py
│       │       ├── payments.py
│       │       └── contacts.py
│       ├── notifications.py
│       └── uploads.py             # POST /uploads/presigned  POST /uploads/confirm
│
└── tests/
    ├── conftest.py
    ├── unit/
    │   ├── domain/
    │   └── application/
    ├── integration/
    │   ├── repositories/
    │   └── api/
    └── e2e/
```

---

## 2. Зависимости (pyproject.toml)

```toml
[tool.poetry]
name = "eduplatform-backend"
version = "0.1.0"
description = "EduPlatform centralized backend"
authors = ["shukhratbekovb"]
python = "^3.12"

[tool.poetry.dependencies]
python = "^3.12"

# ── Web Framework ──────────────────────────────────────────────────────────────
fastapi = "^0.115"
uvicorn = { version = "^0.30", extras = ["standard"] }  # ASGI сервер
python-multipart = "^0.0.9"                              # file upload / form data

# ── Database ───────────────────────────────────────────────────────────────────
sqlalchemy = { version = "^2.0", extras = ["asyncio"] }
asyncpg = "^0.29"           # async PostgreSQL драйвер
alembic = "^1.13"           # миграции

# ── Cache ──────────────────────────────────────────────────────────────────────
redis = { version = "^5.0", extras = ["hiredis"] }

# ── Async task queue ───────────────────────────────────────────────────────────
celery = { version = "^5.4", extras = ["redis"] }
kombu = "^5.3"              # RabbitMQ transport для Celery

# ── Auth ───────────────────────────────────────────────────────────────────────
python-jose = { version = "^3.3", extras = ["cryptography"] }  # JWT
passlib = { version = "^1.7", extras = ["bcrypt"] }             # password hash

# ── Validation & Settings ──────────────────────────────────────────────────────
pydantic = "^2.7"
pydantic-settings = "^2.3"   # .env → Settings class

# ── HTTP utilities ─────────────────────────────────────────────────────────────
httpx = "^0.27"              # async HTTP клиент (webhooks, внешние запросы)

# ── Date & Time ────────────────────────────────────────────────────────────────
python-dateutil = "^2.9"

# ── Observability ──────────────────────────────────────────────────────────────
structlog = "^24.1"          # структурированные логи
sentry-sdk = { version = "^2.0", extras = ["fastapi"] }

# ── File Storage ──────────────────────────────────────────────────────────────
aioboto3 = "^13.0"          # async AWS S3 клиент (обёртка над boto3 для asyncio)
python-magic = "^0.4"       # определение MIME-типа файла по содержимому (не по расширению)

[tool.poetry.group.dev.dependencies]

# ── Testing ────────────────────────────────────────────────────────────────────
pytest = "^8.2"
pytest-asyncio = "^0.23"     # async тесты
pytest-cov = "^5.0"          # coverage
pytest-mock = "^3.14"        # mocking / monkeypatching
factory-boy = "^3.3"         # фабрики тестовых объектов
faker = "^25.0"              # генерация фейковых данных

# ── Integration test DB ────────────────────────────────────────────────────────
pytest-postgresql = "^6.0"   # временная PostgreSQL для тестов
testcontainers = "^4.5"      # Docker-контейнеры (Postgres, Redis, RabbitMQ)

# ── HTTP тестирование ──────────────────────────────────────────────────────────
httpx = "^0.27"              # AsyncClient для FastAPI тестов (уже в prod)

# ── Code quality ───────────────────────────────────────────────────────────────
ruff = "^0.4"                # linter + formatter (заменяет flake8 + black + isort)
mypy = "^1.10"               # статическая типизация
pre-commit = "^3.7"          # git хуки

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "--cov=src --cov-report=term-missing --cov-fail-under=80"

[tool.ruff]
target-version = "py312"
line-length = 100
select = ["E", "F", "I", "N", "UP", "ANN", "S", "B", "A"]

[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
```

---

## 3. Стратегия тестирования

### Уровни тестов

```
Unit Tests          → тестируют Доменный и Прикладной слои изолированно
Integration Tests   → тестируют репозитории с реальной БД (testcontainers)
API Tests           → тестируют HTTP эндпоинты через AsyncClient (FastAPI TestClient)
E2E Tests           → полный сценарий через запущенный сервер (опционально, CI)
```

---

### Слой 1: Domain — Unit Tests

**Что тестируем:** бизнес-правила, value objects, инварианты агрегатов, доменные события.  
**Инструменты:** `pytest` (без моков, без БД — чистый Python).

```python
# tests/unit/domain/lms/test_lesson.py
import pytest
from src.domain.lms.lesson import Lesson, LessonStatus
from src.domain.shared.value_objects import TimeRange

class TestLesson:
    def test_conduct_lesson_changes_status(self):
        lesson = Lesson.create(group_id=..., date=..., time_range=...)
        lesson.conduct(topic="Python basics")
        assert lesson.status == LessonStatus.COMPLETED

    def test_cannot_conduct_already_conducted_lesson(self):
        lesson = Lesson.create(...)
        lesson.conduct(topic="...")
        with pytest.raises(ValueError, match="already conducted"):
            lesson.conduct(topic="again")

    def test_cancel_emits_domain_event(self):
        lesson = Lesson.create(...)
        lesson.cancel(reason="Teacher sick")
        assert any(isinstance(e, LessonCancelledEvent) for e in lesson.domain_events)

# tests/unit/domain/lms/test_student.py
class TestStudentRisk:
    def test_high_risk_when_attendance_below_50(self):
        student = Student(attendance_percent=Decimal("45.0"), ...)
        student.recalculate_risk()
        assert student.risk_level == RiskLevel.HIGH

    def test_normal_risk_when_all_metrics_ok(self):
        student = Student(attendance_percent=Decimal("90.0"), gpa=Decimal("9.0"), ...)
        student.recalculate_risk()
        assert student.risk_level == RiskLevel.NORMAL

# tests/unit/domain/crm/test_lead.py
class TestLead:
    def test_mark_won_changes_status(self):
        lead = Lead.create(full_name="Test", phone="+998901234567", ...)
        lead.mark_won()
        assert lead.status == LeadStatus.WON

    def test_mark_lost_requires_reason(self):
        lead = Lead.create(...)
        with pytest.raises(ValueError):
            lead.mark_lost(reason="")

    def test_move_stage_records_change(self):
        lead = Lead.create(...)
        lead.move_to_stage(new_stage_id=uuid4(), changed_by=uuid4())
        assert len(lead.domain_events) == 1
```

---

### Слой 2: Application — Unit Tests с моками

**Что тестируем:** Use Cases, оркестровку между репозиториями и сервисами.  
**Инструменты:** `pytest-mock` (MockRepository через Protocol / ABC).

```python
# tests/unit/application/lms/test_conduct_lesson_use_case.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.application.lms.lessons.use_cases import ConductLessonUseCase
from src.application.lms.lessons.schemas import ConductLessonCommand

class TestConductLessonUseCase:
    @pytest.fixture
    def lesson_repo(self):
        repo = AsyncMock()
        repo.get_by_id.return_value = FakeLesson(status="scheduled")
        return repo

    @pytest.fixture
    def use_case(self, lesson_repo):
        return ConductLessonUseCase(
            lesson_repo=lesson_repo,
            attendance_repo=AsyncMock(),
            grade_repo=AsyncMock(),
            diamond_repo=AsyncMock(),
            event_bus=MagicMock(),
        )

    async def test_conduct_lesson_saves_attendance(self, use_case, lesson_repo):
        cmd = ConductLessonCommand(
            lesson_id=uuid4(),
            topic="OOP basics",
            attendance=[{"student_id": uuid4(), "status": "present"}],
            grades=[],
            diamonds=[],
            conducted_by=uuid4(),
        )
        await use_case.execute(cmd)
        lesson_repo.save.assert_called_once()

    async def test_raises_when_lesson_not_found(self, lesson_repo, use_case):
        lesson_repo.get_by_id.return_value = None
        with pytest.raises(LessonNotFoundError):
            await use_case.execute(ConductLessonCommand(lesson_id=uuid4(), ...))

# tests/unit/application/crm/test_create_lead_use_case.py
class TestCreateLeadUseCase:
    async def test_creates_lead_and_publishes_event(self):
        repo = AsyncMock()
        event_bus = MagicMock()
        use_case = CreateLeadUseCase(lead_repo=repo, event_bus=event_bus)

        result = await use_case.execute(CreateLeadCommand(
            full_name="Иван Иванов",
            phone="+998901112233",
            funnel_id=uuid4(),
            stage_id=uuid4(),
            source_id=uuid4(),
            assigned_to=uuid4(),
        ))

        repo.save.assert_called_once()
        event_bus.publish.assert_called_once()
        assert result.status == "active"
```

---

### Слой 3: Infrastructure — Integration Tests

**Что тестируем:** SQL-запросы, репозитории на реальной PostgreSQL в Docker.  
**Инструменты:** `testcontainers`, `pytest-asyncio`, реальные миграции Alembic.

```python
# tests/integration/repositories/test_lesson_repository.py
import pytest
from testcontainers.postgres import PostgresContainer
from src.infrastructure.persistence.repositories.lms.lesson import LessonRepository

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:16") as pg:
        yield pg

@pytest.fixture(scope="session")
async def db_session(postgres):
    engine = create_async_engine(postgres.get_connection_url())
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSession(engine) as session:
        yield session

class TestLessonRepository:
    async def test_save_and_get_lesson(self, db_session, lesson_factory):
        repo = LessonRepository(db_session)
        lesson = lesson_factory.build()

        await repo.save(lesson)
        fetched = await repo.get_by_id(lesson.id)

        assert fetched is not None
        assert fetched.group_id == lesson.group_id

    async def test_filter_by_date_range(self, db_session, lesson_factory):
        repo = LessonRepository(db_session)
        lessons = lesson_factory.build_batch(5)
        for l in lessons:
            await repo.save(l)

        result = await repo.find_by_date_range(
            from_date=date(2026, 1, 1),
            to_date=date(2026, 1, 31),
        )
        assert isinstance(result, list)

# tests/integration/repositories/test_lead_repository.py
class TestLeadRepository:
    async def test_filter_by_stage_and_status(self, db_session):
        repo = LeadRepository(db_session)
        leads = await repo.find(stage_id=some_stage_id, status="active")
        assert all(l.status == "active" for l in leads)

    async def test_paginate_leads(self, db_session):
        repo = LeadRepository(db_session)
        result = await repo.find_paginated(page=1, limit=5)
        assert len(result.data) <= 5
```

---

### Слой 4: API — Integration Tests

**Что тестируем:** HTTP роутеры, middleware, auth guards, сериализацию.  
**Инструменты:** `httpx.AsyncClient` + `app` (FastAPI), реальная тестовая БД.

```python
# tests/integration/api/lms/test_lessons_api.py
import pytest
from httpx import AsyncClient
from src.main import create_app

@pytest.fixture
async def client(db_session):
    app = create_app(override_db=db_session)
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def auth_headers(client):
    resp = await client.post("/auth/login", json={
        "email": "director@test.com",
        "password": "password123"
    })
    token = resp.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}

class TestLessonsAPI:
    async def test_create_single_lesson(self, client, auth_headers, group_factory):
        group = await group_factory.create()
        resp = await client.post("/lms/lessons", headers=auth_headers, json={
            "groupId": str(group.id),
            "date": "2026-05-01",
            "startTime": "19:00",
            "endTime": "20:30",
        })
        assert resp.status_code == 201
        assert resp.json()["groupId"] == str(group.id)

    async def test_bulk_create_lessons(self, client, auth_headers):
        resp = await client.post("/lms/lessons/bulk", headers=auth_headers, json={
            "groupId": "...",
            "startDate": "2026-05-01",
            "endDate": "2026-05-31",
            "weekdays": [1, 3, 5],
            "startTime": "19:00",
            "endTime": "20:30",
        })
        assert resp.status_code == 201
        assert len(resp.json()) > 0

    async def test_conduct_lesson(self, client, auth_headers, lesson_factory):
        lesson = await lesson_factory.create(status="scheduled")
        resp = await client.post(
            f"/lms/lessons/{lesson.id}/conduct",
            headers=auth_headers,
            json={"topic": "Python basics", "attendance": [], "grades": [], "diamonds": []},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    async def test_unauthorized_without_token(self, client):
        resp = await client.get("/lms/lessons")
        assert resp.status_code == 401

    async def test_teacher_cannot_access_finance(self, client, teacher_headers):
        resp = await client.get("/lms/finance/payments", headers=teacher_headers)
        assert resp.status_code == 403

# tests/integration/api/crm/test_leads_api.py
class TestLeadsAPI:
    async def test_create_and_move_stage(self, client, auth_headers):
        # Create
        create_resp = await client.post("/crm/leads", headers=auth_headers, json={
            "fullName": "Иван Иванов",
            "phone": "+998901112233",
            "funnelId": "...",
            "stageId": "...",
            "assignedTo": "...",
        })
        assert create_resp.status_code == 201
        lead_id = create_resp.json()["id"]

        # Move stage
        move_resp = await client.post(
            f"/crm/leads/{lead_id}/move-stage",
            headers=auth_headers,
            json={"stageId": "next-stage-id"},
        )
        assert move_resp.status_code == 200

    async def test_mark_lost_requires_reason(self, client, auth_headers, lead_factory):
        lead = await lead_factory.create()
        resp = await client.post(
            f"/crm/leads/{lead.id}/mark-lost",
            headers=auth_headers,
            json={"reason": ""},
        )
        assert resp.status_code == 422
```

---

### Celery Tasks — Integration Tests

```python
# tests/integration/workers/test_risk_task.py
import pytest
from src.infrastructure.workers.tasks.risk import recalculate_student_risk

class TestRiskCalculationTask:
    async def test_risk_task_updates_student_level(self, db_session, student_factory):
        student = await student_factory.create(attendance_percent=40.0, gpa=4.0)

        await recalculate_student_risk(student_id=str(student.id))

        updated = await StudentRepository(db_session).get_by_id(student.id)
        assert updated.risk_level == "high"
```

---

## 4. Фабрики тестовых данных (factory-boy)

```python
# tests/factories.py
import factory
from factory.alchemy import SQLAlchemyModelFactory
from src.infrastructure.persistence.models.lms import LessonModel, StudentModel
from src.infrastructure.persistence.models.crm import LeadModel

class UserFactory(SQLAlchemyModelFactory):
    class Meta:
        model = UserModel
    id         = factory.LazyFunction(uuid4)
    name       = factory.Faker("name", locale="ru_RU")
    email      = factory.Faker("email")
    role       = "teacher"
    is_active  = True

class StudentFactory(SQLAlchemyModelFactory):
    class Meta:
        model = StudentModel
    id           = factory.LazyFunction(uuid4)
    full_name    = factory.Faker("name", locale="ru_RU")
    student_code = factory.Sequence(lambda n: f"SEP-2426{n:02d}")
    risk_level   = "normal"
    stars        = 0
    crystals     = 0

class LessonFactory(SQLAlchemyModelFactory):
    class Meta:
        model = LessonModel
    id         = factory.LazyFunction(uuid4)
    date       = factory.Faker("date_this_year")
    start_time = "19:00"
    end_time   = "20:30"
    status     = "scheduled"
    is_online  = False

class LeadFactory(SQLAlchemyModelFactory):
    class Meta:
        model = LeadModel
    id        = factory.LazyFunction(uuid4)
    full_name = factory.Faker("name", locale="ru_RU")
    phone     = factory.Faker("phone_number")
    status    = "active"
```

---

## 5. Фазы разработки

### Фаза 0 — Инфраструктура проекта (3 дня)

- [ ] `poetry init`, добавить все зависимости
- [ ] Настроить `.env.example`, `config.py` (pydantic-settings)
- [ ] `docker-compose.yml`: PostgreSQL 16, Redis 7, RabbitMQ 3
- [ ] Alembic: `env.py` с async engine, `alembic.ini`
- [ ] `src/database.py`: async engine, `get_db` dependency
- [ ] `src/redis.py`: пул соединений
- [ ] `src/main.py`: FastAPI app factory, CORS, lifespan
- [ ] Настроить `ruff`, `mypy`, `pre-commit`
- [ ] CI: GitHub Actions (lint → test → coverage)

**Тесты Фазы 0:**
```
tests/unit/test_config.py          — settings загружаются из .env
tests/integration/test_db.py       — соединение с PostgreSQL
tests/integration/test_redis.py    — ping Redis
```

---

### Фаза 1 — Domain Layer (4 дня)

- [ ] `shared/`: BaseEntity, AggregateRoot, DomainEvent, value objects (Email, Phone, Money, TimeRange)
- [ ] `domain/auth/`: User aggregate
- [ ] `domain/lms/`: Student, Group, Lesson, Grade, Homework, Payment aggregates + events
- [ ] `domain/crm/`: Lead, Funnel, Stage, Task aggregates + events
- [ ] `domain/gamification/`: Achievement aggregate

**Тесты Фазы 1 (Unit):**
```
tests/unit/domain/shared/      — value objects валидация
tests/unit/domain/lms/         — Lesson conduct/cancel, Student risk, Grade invariants
tests/unit/domain/crm/         — Lead transitions, mark_won/lost, stage moves
tests/unit/domain/gamification/ — Achievement unlock rules
```

---

### Фаза 2 — Infrastructure: Models + Migrations (3 дня)

- [ ] SQLAlchemy модели для всех 37 таблиц (EER.md → Python)
- [ ] Alembic: начальная миграция `0001_initial.py`
- [ ] ENUM типы в PostgreSQL
- [ ] Индексы

**Тесты Фазы 2 (Integration):**
```
tests/integration/test_migrations.py   — alembic upgrade/downgrade
tests/integration/test_models.py       — базовый INSERT/SELECT для каждой модели
```

---

### Фаза 3 — Infrastructure: Repositories (5 дней)

Реализовать репозитории для всех агрегатов:
- [ ] `UserRepository` — CRUD + find_by_email
- [ ] `StudentRepository` — CRUD, пагинация, фильтр по risk_level
- [ ] `GroupRepository` — CRUD, filter by teacher/direction
- [ ] `LessonRepository` — CRUD, filter by date range/teacher/group, bulk insert
- [ ] `AttendanceRepository` — bulk upsert
- [ ] `GradeRepository` — bulk insert
- [ ] `HomeworkRepository` + `HomeworkSubmissionRepository`
- [ ] `PaymentRepository` — filter by status/student
- [ ] `LeadRepository` — пагинация, все фильтры, JSONB custom_fields
- [ ] `FunnelRepository`, `StageRepository`, `CustomFieldRepository`
- [ ] `LeadActivityRepository`, `LeadCommentRepository`
- [ ] `CrmTaskRepository`
- [ ] `AchievementRepository`, `StudentAchievementRepository`

**Тесты Фазы 3 (Integration с testcontainers):**
```
tests/integration/repositories/lms/   — каждый репозиторий отдельный файл
tests/integration/repositories/crm/
```

---

### Фаза 4 — Application: Auth Use Cases (2 дня)

- [ ] `LoginUseCase` (email+password → JWT)
- [ ] `StudentLoginUseCase` (отдельная схема ответа)
- [ ] `RefreshTokenUseCase`
- [ ] JWT сервис (create, decode, verify)
- [ ] bcrypt сервис
- [ ] FastAPI dependencies: `get_current_user`, `require_role(roles)`

**Тесты Фазы 4:**
```
tests/unit/application/auth/        — LoginUseCase с мок-репозиторием
tests/integration/api/test_auth.py  — POST /auth/login, /auth/me, /auth/logout
```

---

### Фаза 5 — Application + API: LMS Core (7 дней)

Use cases + роутеры для:
- [ ] Users / Staff CRUD
- [ ] Directions, Subjects, Rooms CRUD + archive
- [ ] Groups CRUD + archive + students + lessons
- [ ] Enrollments (enroll / unenroll)
- [ ] Lessons: CRUD, bulk create, conduct, cancel, materials
- [ ] Students: CRUD, пагинация, risk

**Тесты Фазы 5:**
```
tests/unit/application/lms/        — use case unit тесты (mock repos)
tests/integration/api/lms/         — HTTP тесты: CRUD, auth guards, 404, 403
```

---

### Фаза 6 — Application + API: LMS Advanced (5 дней)

- [ ] Homework: задания + сдачи + проверка
- [ ] Late Entry Requests
- [ ] MUP Tasks
- [ ] Exams
- [ ] Compensation models
- [ ] Finance payments
- [ ] Notifications

**Тесты Фазы 6:**
```
tests/unit/application/lms/homework/
tests/integration/api/lms/homework_api.py
tests/integration/api/lms/finance_api.py
```

---

### Фаза 7 — Application + API: CRM (7 дней)

- [ ] Funnels + Stages + reorder + migrate-leads
- [ ] Custom Fields + reorder
- [ ] Lead Sources + webhook secret
- [ ] Leads: CRUD, пагинация, все фильтры
- [ ] Lead transitions: move-stage, mark-won, mark-lost
- [ ] Timeline: activities, stage changes, assignment changes, comments
- [ ] CRM Tasks + move status
- [ ] CRM Notifications

**Тесты Фазы 7:**
```
tests/unit/application/crm/
tests/integration/api/crm/leads_api.py
tests/integration/api/crm/funnels_api.py
tests/integration/api/crm/analytics_api.py
```

---

### Фаза 8 — Application + API: Student Portal (4 дня)

- [ ] Dashboard (агрегированный ответ)
- [ ] Schedule
- [ ] Subjects + Performance
- [ ] Assignments list + submit
- [ ] Materials (с фильтром по языку)
- [ ] Achievements
- [ ] Leaderboard
- [ ] Payments (view only)
- [ ] Contacts
- [ ] Profile update

**Тесты Фазы 8:**
```
tests/integration/api/student/dashboard_api.py
tests/integration/api/student/assignments_api.py
tests/unit/application/student_portal/
```

---

### Фаза 9 — Analytics + Reports (4 дня)

- [ ] LMS аналитика: overview, attendance, grades, risk, homework, teachers
- [ ] LMS отчёты: income, performance, teacher-hours, by-direction
- [ ] CRM аналитика: overview, sources, managers, funnel-conversion, loss-reasons, time-to-close, forecast, sankey
- [ ] Кэширование тяжёлых запросов в Redis (TTL 5 мин)

**Тесты Фазы 9:**
```
tests/integration/api/lms/analytics_api.py
tests/integration/api/crm/analytics_api.py
tests/unit/application/lms/analytics/  — агрегационные расчёты
```

---

### Фаза 10 — Celery Workers (3 дня)

- [ ] `celery_app.py` с RabbitMQ broker + Redis result backend
- [ ] `tasks/risk.py` — ночной пересчёт risk_level всех студентов
- [ ] `tasks/salary.py` — ежемесячный расчёт зарплат учителей
- [ ] `tasks/notifications.py` — напоминания о задачах CRM
- [ ] `schedules.py` — celery beat расписание

**Тесты Фазы 10:**
```
tests/integration/workers/test_risk_task.py     — task с реальной БД
tests/integration/workers/test_salary_task.py
tests/unit/application/workers/                 — логика расчётов изолированно
```

---

### Фаза 11 — Gamification (2 дня)

- [ ] Stars/Crystals начисление при: посещении, оценках, достижениях
- [ ] Achievement unlock checker (запускается после каждого события)
- [ ] StudentActivityEvents запись в ленту
- [ ] Leaderboard расчёт (кэш Redis, пересчёт раз в час)

**Тесты:**
```
tests/unit/domain/gamification/test_achievement_unlock.py
tests/integration/api/student/achievements_api.py
```

---

### Фаза 12 — File Storage: AWS S3 (2 дня)

Файловая загрузка используется в трёх местах:
- **Homework submissions** — студент загружает ZIP/PDF с выполненным заданием
- **Lesson materials** — учитель загружает PDF, презентацию, видео-ссылку
- **Student/Staff avatars** — фото профиля

#### Стратегия: Presigned URL (загрузка напрямую с браузера на S3)

```
Клиент                    Backend                        AWS S3
  │                          │                              │
  │─ POST /uploads/presigned─►│                              │
  │  { filename, content_type}│                              │
  │                          │──generate_presigned_post()──►│
  │                          │◄─{ url, fields }─────────────│
  │◄─ { upload_url, key } ───│                              │
  │                          │                              │
  │──── PUT upload_url ──────────────────────────────────►  │
  │  (файл идёт напрямую,                                   │
  │   без прокси через backend)                             │
  │◄─── 204 No Content ─────────────────────────────────────│
  │                          │                              │
  │─ POST /uploads/confirm ─►│                              │
  │  { key, entity, entity_id}│                             │
  │                          │── проверить key существует ─►│
  │                          │── сохранить URL в БД         │
  │◄─ { public_url } ────────│                              │
```

#### `infrastructure/services/file_storage.py`

```python
import aioboto3
from botocore.exceptions import ClientError
from src.config import Settings

class FileStorageService:
    """Async S3 file storage via aioboto3."""

    ALLOWED_MIME_TYPES = {
        "homework":  ["application/pdf", "application/zip",
                      "application/x-zip-compressed",
                      "application/msword",
                      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        "material":  ["application/pdf", "video/mp4", "video/webm",
                      "application/vnd.ms-powerpoint",
                      "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
        "avatar":    ["image/jpeg", "image/png", "image/webp"],
    }

    MAX_SIZE_BYTES = {
        "homework": 50 * 1024 * 1024,   # 50 MB
        "material": 500 * 1024 * 1024,  # 500 MB
        "avatar":   5 * 1024 * 1024,    # 5 MB
    }

    def __init__(self, settings: Settings) -> None:
        self._session  = aioboto3.Session()
        self._bucket   = settings.AWS_BUCKET_NAME
        self._region   = settings.AWS_REGION
        self._base_url = f"https://{self._bucket}.s3.{self._region}.amazonaws.com"

    async def generate_presigned_post(
        self,
        key: str,           # e.g. "homework/2026/05/abc123.zip"
        content_type: str,
        upload_type: str,   # "homework" | "material" | "avatar"
        expires_in: int = 300,
    ) -> dict:
        """Генерирует presigned POST для прямой загрузки с клиента на S3."""
        max_size = self.MAX_SIZE_BYTES[upload_type]
        async with self._session.client("s3", region_name=self._region) as s3:
            return await s3.generate_presigned_post(
                Bucket=self._bucket,
                Key=key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, max_size],
                ],
                ExpiresIn=expires_in,
            )

    async def object_exists(self, key: str) -> bool:
        """Проверяет, был ли файл загружен в S3."""
        async with self._session.client("s3", region_name=self._region) as s3:
            try:
                await s3.head_object(Bucket=self._bucket, Key=key)
                return True
            except ClientError:
                return False

    async def delete_object(self, key: str) -> None:
        """Удалить файл из S3 (при удалении submission/материала)."""
        async with self._session.client("s3", region_name=self._region) as s3:
            await s3.delete_object(Bucket=self._bucket, Key=key)

    def public_url(self, key: str) -> str:
        return f"{self._base_url}/{key}"
```

#### `infrastructure/services/file_validator.py`

```python
import magic   # python-magic
from fastapi import HTTPException

class FileValidator:
    @staticmethod
    def validate_mime(file_bytes: bytes, allowed_mimes: list[str]) -> str:
        """Определяет MIME по содержимому файла (не по расширению)."""
        detected = magic.from_buffer(file_bytes[:2048], mime=True)
        if detected not in allowed_mimes:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {detected}. Allowed: {allowed_mimes}",
            )
        return detected

    @staticmethod
    def safe_key(filename: str, prefix: str) -> str:
        """Генерирует безопасный S3 ключ, убирая спецсимволы."""
        import uuid, re, os
        ext  = os.path.splitext(filename)[-1].lower()
        name = re.sub(r"[^\w]", "_", os.path.splitext(filename)[0])[:40]
        return f"{prefix}/{uuid.uuid4().hex}_{name}{ext}"
```

#### `api/v1/uploads.py` — эндпоинты

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from src.api.dependencies import get_current_user, get_file_storage
from src.infrastructure.services.file_storage import FileStorageService
from src.infrastructure.services.file_validator import FileValidator

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_PREFIXES = {
    "homework": "homework",
    "material": "materials",
    "avatar":   "avatars",
}

class PresignedRequest(BaseModel):
    filename: str         # оригинальное имя файла
    content_type: str     # MIME, который говорит браузер
    upload_type: str      # "homework" | "material" | "avatar"

class PresignedResponse(BaseModel):
    upload_url: str       # S3 presigned POST url
    fields: dict          # поля, которые нужно включить в multipart
    key: str              # S3 ключ (нужен для /confirm)

class ConfirmRequest(BaseModel):
    key: str
    upload_type: str
    entity: str           # "homework_submission" | "lesson_material" | "user_avatar"
    entity_id: str        # UUID объекта, к которому привязываем файл

class ConfirmResponse(BaseModel):
    public_url: str

@router.post("/presigned", response_model=PresignedResponse)
async def get_presigned_url(
    body: PresignedRequest,
    current_user=Depends(get_current_user),
    storage: FileStorageService = Depends(get_file_storage),
):
    if body.upload_type not in FileStorageService.ALLOWED_MIME_TYPES:
        raise HTTPException(400, "Invalid upload_type")

    allowed = FileStorageService.ALLOWED_MIME_TYPES[body.upload_type]
    if body.content_type not in allowed:
        raise HTTPException(415, f"Unsupported content type. Allowed: {allowed}")

    prefix = UPLOAD_PREFIXES[body.upload_type]
    key    = FileValidator.safe_key(body.filename, prefix)

    result = await storage.generate_presigned_post(
        key=key,
        content_type=body.content_type,
        upload_type=body.upload_type,
    )
    return PresignedResponse(upload_url=result["url"], fields=result["fields"], key=key)


@router.post("/confirm", response_model=ConfirmResponse)
async def confirm_upload(
    body: ConfirmRequest,
    current_user=Depends(get_current_user),
    storage: FileStorageService = Depends(get_file_storage),
):
    # Убеждаемся что файл реально появился в S3
    if not await storage.object_exists(body.key):
        raise HTTPException(404, "File not found in storage. Upload may have failed.")

    public_url = storage.public_url(body.key)

    # Сохраняем URL в нужную сущность (через use case)
    # Здесь можно передать entity+entity_id в соответствующий use case
    # Например: await update_submission_file(entity_id, public_url)

    return ConfirmResponse(public_url=public_url)
```

#### Добавленные S3-эндпоинты в API_ENDPOINTS.md

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| POST | `/uploads/presigned` | `{ filename, content_type, upload_type }` | Получить presigned URL для загрузки напрямую на S3 |
| POST | `/uploads/confirm` | `{ key, upload_type, entity, entity_id }` | Подтвердить загрузку, сохранить URL в БД |

#### S3 Bucket политика (CORS для браузерной загрузки)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST"],
    "AllowedOrigins": [
      "https://logbook.eduplatform.uz",
      "https://crm.eduplatform.uz",
      "https://student.eduplatform.uz"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

#### Тесты Фазы 12 (File Storage)

```python
# tests/unit/application/test_file_storage.py
from unittest.mock import AsyncMock, patch

class TestFileStorageService:
    async def test_generate_presigned_post_returns_url_and_fields(self):
        with patch("aioboto3.Session") as mock_session:
            mock_s3 = AsyncMock()
            mock_s3.generate_presigned_post.return_value = {
                "url": "https://bucket.s3.amazonaws.com",
                "fields": {"key": "homework/abc.zip", "Content-Type": "application/zip"},
            }
            mock_session.return_value.__aenter__.return_value = mock_s3

            service = FileStorageService(settings=FakeSettings())
            result  = await service.generate_presigned_post(
                key="homework/abc.zip",
                content_type="application/zip",
                upload_type="homework",
            )
            assert "url" in result
            assert "fields" in result

    async def test_object_exists_returns_false_on_client_error(self):
        with patch("aioboto3.Session") as mock_session:
            mock_s3 = AsyncMock()
            mock_s3.head_object.side_effect = ClientError({}, "HeadObject")
            mock_session.return_value.__aenter__.return_value = mock_s3

            service = FileStorageService(settings=FakeSettings())
            assert await service.object_exists("nonexistent/key.zip") is False

# tests/unit/application/test_file_validator.py
class TestFileValidator:
    def test_rejects_disallowed_mime(self):
        fake_bytes = b"PK\x03\x04"  # ZIP magic bytes
        with pytest.raises(HTTPException) as exc:
            FileValidator.validate_mime(fake_bytes, allowed_mimes=["image/jpeg"])
        assert exc.value.status_code == 415

    def test_safe_key_removes_special_chars(self):
        key = FileValidator.safe_key("my file (1).pdf", prefix="homework")
        assert " " not in key
        assert "(" not in key
        assert key.endswith(".pdf")

# tests/integration/api/test_uploads_api.py
class TestUploadsAPI:
    async def test_presigned_returns_400_for_invalid_type(self, client, auth_headers):
        resp = await client.post("/uploads/presigned", headers=auth_headers, json={
            "filename": "test.zip",
            "content_type": "application/zip",
            "upload_type": "invalid_type",
        })
        assert resp.status_code == 400

    async def test_presigned_returns_415_for_wrong_mime(self, client, auth_headers):
        resp = await client.post("/uploads/presigned", headers=auth_headers, json={
            "filename": "photo.jpg",
            "content_type": "image/jpeg",
            "upload_type": "homework",   # homework не принимает картинки
        })
        assert resp.status_code == 415

    async def test_confirm_returns_404_when_key_not_in_s3(
        self, client, auth_headers, mock_storage
    ):
        mock_storage.object_exists.return_value = False
        resp = await client.post("/uploads/confirm", headers=auth_headers, json={
            "key": "homework/nonexistent.zip",
            "upload_type": "homework",
            "entity": "homework_submission",
            "entity_id": str(uuid4()),
        })
        assert resp.status_code == 404
```

#### .env.example — дополнение для S3

```env
# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=eduplatform-files
AWS_REGION=us-east-1

# Или MinIO (self-hosted, совместим с S3 API)
AWS_ENDPOINT_URL=http://localhost:9000   # только для MinIO
```

---

### Фаза 13 — Production-ready (3 дня)

- [ ] `structlog` структурированные логи
- [ ] Sentry интеграция
- [ ] Rate limiting (slowapi / middleware)
- [ ] Health check эндпоинт `GET /health`
- [ ] Dockerfile (multi-stage)
- [ ] `docker-compose.prod.yml`
- [ ] Финальный прогон всех тестов, coverage ≥ 80%

---

## 6. Расположение файлов инфраструктуры

```
eduplatform/                  ← корень монорепозитория
├── docker-compose.yml        ← единый compose для всех сервисов (инфра + backend)
├── backend/
│   ├── Dockerfile            ← только образ backend (api / worker / beat)
│   ├── pyproject.toml
│   └── src/
├── logbook/                  ← Next.js, запускается отдельно (npm run dev)
├── crm/
└── student/
```

> Frontend приложения (logbook, crm, student) **не** входят в docker-compose —  
> они запускаются локально через `npm run dev` и обращаются к API на `localhost:8000`.

---

## 6a. backend/Dockerfile

```dockerfile
# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Системные зависимости для python-magic и asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем poetry
RUN pip install --no-cache-dir poetry==1.8.*

# Копируем только манифесты — используем кэш Docker при неизменных зависимостях
COPY pyproject.toml poetry.lock ./

# Устанавливаем зависимости в системный Python (без venv внутри контейнера)
RUN poetry config virtualenvs.create false \
    && poetry install --only main --no-interaction --no-ansi

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Копируем установленные пакеты из builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Копируем исходники
COPY src ./src
COPY alembic ./alembic
COPY alembic.ini .

# Непривилегированный пользователь
RUN useradd -m -u 1001 appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# CMD задаётся в docker-compose (api / worker / beat)
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 6b. docker-compose.yml (корень проекта)

```yaml
# eduplatform/docker-compose.yml
# Запуск: docker compose up -d

services:

  # ── Infrastructure ──────────────────────────────────────────────────────────

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: eduplatform
      POSTGRES_USER: edu
      POSTGRES_PASSWORD: edu
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U edu -d eduplatform"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  rabbitmq:
    image: rabbitmq:3-management-alpine
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: edu
      RABBITMQ_DEFAULT_PASS: edu
    ports:
      - "5672:5672"
      - "15672:15672"    # Management UI → http://localhost:15672
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10

  minio:
    image: minio/minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # Web Console → http://localhost:9001
    volumes:
      - miniodata:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio-init:
    image: minio/mc
    depends_on:
      minio:
        condition: service_healthy
    restart: "no"
    entrypoint: >
      /bin/sh -c "
        mc alias set local http://minio:9000 minioadmin minioadmin;
        mc mb --ignore-existing local/eduplatform-files;
        mc anonymous set download local/eduplatform-files/avatars;
        echo 'MinIO bucket ready';
      "

  # ── Backend ─────────────────────────────────────────────────────────────────

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend/src:/app/src    # hot reload в dev режиме
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    command: celery -A src.infrastructure.workers.celery_app worker --loglevel=info -Q default,notifications
    env_file: ./backend/.env
    depends_on:
      rabbitmq:
        condition: service_healthy
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy

  beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    command: celery -A src.infrastructure.workers.celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    env_file: ./backend/.env
    depends_on:
      rabbitmq:
        condition: service_healthy

volumes:
  pgdata:
  miniodata:
```

---

## 7. .env.example

```env
# App
APP_ENV=development
SECRET_KEY=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30

# Database
DATABASE_URL=postgresql+asyncpg://edu:edu@localhost:5432/eduplatform

# Redis
REDIS_URL=redis://localhost:6379/0

# RabbitMQ (Celery broker)
CELERY_BROKER_URL=amqp://edu:edu@localhost:5672//
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Sentry (опционально)
SENTRY_DSN=

# AWS S3 (prod)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=eduplatform-files
AWS_REGION=us-east-1
# AWS_ENDPOINT_URL=              # оставить пустым для настоящего S3

# MinIO (локальная разработка — S3-совместимый)
# AWS_ACCESS_KEY_ID=minioadmin
# AWS_SECRET_ACCESS_KEY=minioadmin
# AWS_BUCKET_NAME=eduplatform-files
# AWS_REGION=us-east-1
# AWS_ENDPOINT_URL=http://localhost:9000
```

---

## 8. CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: eduplatform_test
          POSTGRES_USER: edu
          POSTGRES_PASSWORD: edu
        ports: ["5432:5432"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install Poetry
        run: pip install poetry

      - name: Install dependencies
        run: poetry install

      - name: Lint (ruff)
        run: poetry run ruff check src tests

      - name: Type check (mypy)
        run: poetry run mypy src

      - name: Run tests
        run: poetry run pytest
        env:
          DATABASE_URL: postgresql+asyncpg://edu:edu@localhost:5432/eduplatform_test
          REDIS_URL: redis://localhost:6379/0

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

---

## 9. Итоговые метрики плана

| Метрика | Значение |
|---------|----------|
| Фаз разработки | 13 |
| Ориентировочное время | ~52 дня |
| Таблиц в БД | 37 |
| Эндпоинтов | ~135 (+2 upload) |
| Целевой coverage | ≥ 80% |
| Слоёв тестирования | 4 (unit domain, unit app, integration repo, integration api) |
| Python версия | 3.12 |
| Зависимостей prod | 15 |
| Зависимостей dev | 9 |
| File upload стратегия | Presigned URL → клиент грузит напрямую на S3 |
| Локальный S3 (dev) | MinIO (docker-compose, совместим с S3 API) |
| Поддерживаемые типы | homework: PDF/ZIP/DOC · material: PDF/PPT/MP4 · avatar: JPG/PNG/WEBP |
| Макс. размер файла | homework: 50 MB · material: 500 MB · avatar: 5 MB |
