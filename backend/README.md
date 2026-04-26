# Backend — FastAPI + Clean Architecture + ML

Unified API server for all three frontend applications (CRM, Logbook, Student Portal).

## Technologies

| Category | Library | Version | Purpose |
|-----------|-----------|--------|-----------|
| Web Framework | FastAPI | ^0.115 | Async REST API with auto-documentation |
| ASGI Server | Uvicorn | ^0.30 | Async HTTP server with hot-reload |
| ORM | SQLAlchemy 2 | ^2.0 | Async ORM with typed mappings |
| DB Driver | asyncpg | ^0.30 | Async PostgreSQL driver |
| Migrations | Alembic | ^1.13 | Database migrations |
| Cache | Redis | ^5.0 | Cache + Celery backend |
| Task Queue | Celery | ^5.4 | Background tasks (RabbitMQ broker) |
| Auth | python-jose | ^3.3 | JWT tokens (access + refresh) |
| Passwords | passlib + bcrypt | ^1.7 | Password hashing |
| Validation | Pydantic | ^2.12 | Request/Response validation |
| Settings | pydantic-settings | ^2.3 | Configuration from .env |
| HTTP Client | httpx | ^0.27 | Async HTTP client |
| File Storage | google-cloud-storage | ^3.10 | GCS for files and materials |
| ML | scikit-learn | ^1.5 | Dropout risk model |
| ML | joblib | ^1.4 | ML model serialization |
| ML | numpy | ^2.0 | Numerical computations |
| Logging | structlog | ^24.1 | Structured logging |
| Monitoring | sentry-sdk | ^2.0 | Error monitoring |

## Architecture (Clean Architecture / DDD)

```
backend/
├── src/
│   ├── domain/                   Domain layer (core)
│   │   ├── auth/
│   │   │   ├── entities.py         User, UserRole
│   │   │   └── policies.py        PasswordPolicy, UserCreationPolicy
│   │   ├── lms/
│   │   │   ├── entities.py         Student, Lesson, Group, Payment, 8 enums
│   │   │   ├── policies.py        RiskCalculationPolicy, PaymentOverduePolicy
│   │   │   └── events.py          Domain events (5 types)
│   │   └── shared/
│   │       ├── entity.py           Entity, AggregateRoot
│   │       ├── events.py          DomainEvent base
│   │       └── value_objects.py   Email, Phone, Money, TimeRange, Grade
│   │
│   ├── application/              Application layer (Use Cases)
│   │   ├── auth/
│   │   │   └── use_cases.py       Login, Refresh, CreateUser, ChangePassword
│   │   ├── lms/
│   │   │   └── students/
│   │   │       └── use_cases.py   CRUD + RecalculateRisk
│   │   └── interfaces/
│   │       └── repositories.py    Abstract repositories (11 interfaces)
│   │
│   ├── api/                      API layer (FastAPI routers)
│   │   ├── dependencies.py        Auth guards, platform guards
│   │   └── v1/
│   │       ├── auth/              Login, Profile, Users
│   │       ├── lms/               Students, Lessons, Attendance, Grades,
│   │       │                      Homework, Analytics, Reports, MUP Tasks,
│   │       │                      Payments, Exams, Compensation, Late Requests
│   │       ├── crm/               Funnels, Leads, Tasks, Contracts, Analytics
│   │       ├── student/           Student Portal API
│   │       ├── notifications.py   Unified notifications (LMS + CRM)
│   │       └── gamification.py    Achievements, Awards, Shop, Leaderboard
│   │
│   ├── infrastructure/           Infrastructure layer
│   │   ├── persistence/
│   │   │   ├── models/            ORM models (auth, lms 22 tables, crm, gamification)
│   │   │   └── repositories/     SQL repository implementations
│   │   ├── services/
│   │   │   ├── gamification_engine.py  Auto-awarding stars/crystals
│   │   │   ├── jwt_service.py         JWT creation/validation
│   │   │   └── password_service.py    bcrypt hash/verify
│   │   └── workers/
│   │       ├── celery_app.py          Celery config (9 periodic tasks)
│   │       └── tasks/
│   │           ├── risk.py            ML risk recalculation
│   │           ├── notifications.py   Auto-notifications (5 tasks)
│   │           ├── auto_tasks.py      MUP task generation (3 tasks)
│   │           └── salary.py          Payment overdue marking
│   │
│   ├── ml/                       ML Risk Scoring
│   │   ├── feature_extractor.py    14 features from DB (async, batch)
│   │   ├── predictor.py            Model loader (singleton, joblib)
│   │   ├── risk_scorer.py          Orchestrator: extract → predict → map
│   │   ├── models/
│   │   │   └── risk_model.joblib   Trained model (~671 KB)
│   │   └── data/
│   │       └── risk_dataset.csv    Synthetic training data (5000 rows)
│   │
│   ├── config.py                 Pydantic Settings (.env)
│   ├── database.py               SQLAlchemy async engine + session
│   └── main.py                   FastAPI app factory + lifespan
│
├── scripts/
│   ├── seed_full.py              Comprehensive seed (200 students, 730 lessons)
│   ├── generate_risk_dataset.py  Synthetic dataset generation
│   ├── train_risk_model.py       ML model training
│   ├── run_ml_scoring.py         Manual ML scoring run
│   └── recalc_gamification.py    Gamification recalculation
│
├── alembic/                      DB migrations
├── tests/                        292 unit tests
├── pyproject.toml                Poetry dependencies
├── Dockerfile                    Multi-stage build (python:3.13-slim)
└── README.md                     (this file)
```

## Running

```bash
# Docker
docker compose up -d --build api

# Migrations
docker compose exec api alembic upgrade head

# Dev (local)
cd backend
poetry install
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

Swagger UI: http://localhost:8000/docs

| Group | Prefix | Description |
|--------|--------|----------|
| Auth | `/api/v1/auth` | Login, refresh, profile, users |
| Students | `/api/v1/lms/students` | CRUD + ML risk + enrollment |
| Lessons | `/api/v1/lms/lessons` | CRUD + conduct + materials |
| Attendance | `/api/v1/lms/attendance` | Bulk recording |
| Grades | `/api/v1/lms/grades` | CRUD with GPA recalc |
| Homework | `/api/v1/lms/homework` | Assignments + submissions |
| Analytics | `/api/v1/lms/analytics` | Overview, charts, teachers |
| Reports | `/api/v1/lms/reports` | Finance, hours, performance |
| Tasks | `/api/v1/lms/tasks` | MUP tasks (kanban) |
| CRM | `/api/v1/crm/*` | Funnels, leads, contracts |
| Student | `/api/v1/student/*` | Student portal endpoints |
| Notifications | `/api/v1/notifications` | Unified LMS + CRM |
| Gamification | `/api/v1/gamification` | Awards, shop, leaderboard |

## ML Model

- **Algorithm:** GradientBoostingClassifier + CalibratedClassifierCV
- **Features:** 14 (4 domains: attendance, grades, homework, payment)
- **ROC-AUC:** 0.93
- **Training:** 5000 synthetic profiles, 5 archetypes

## Tests

```bash
cd backend
poetry run pytest tests/unit/ -v
```
