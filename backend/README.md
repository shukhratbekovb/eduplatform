# Backend — FastAPI + Clean Architecture + ML

Единый API-сервер для всех трёх фронтенд-приложений (CRM, Logbook, Student Portal).

## Технологии

| Категория | Библиотека | Версия | Назначение |
|-----------|-----------|--------|-----------|
| Web Framework | FastAPI | ^0.115 | Async REST API с автодокументацией |
| ASGI Server | Uvicorn | ^0.30 | Async HTTP-сервер с hot-reload |
| ORM | SQLAlchemy 2 | ^2.0 | Async ORM с typed mappings |
| DB Driver | asyncpg | ^0.30 | Async PostgreSQL драйвер |
| Migrations | Alembic | ^1.13 | Миграции базы данных |
| Cache | Redis | ^5.0 | Кэш + backend для Celery |
| Task Queue | Celery | ^5.4 | Фоновые задачи (RabbitMQ broker) |
| Auth | python-jose | ^3.3 | JWT токены (access + refresh) |
| Passwords | passlib + bcrypt | ^1.7 | Хэширование паролей |
| Validation | Pydantic | ^2.12 | Request/Response валидация |
| Settings | pydantic-settings | ^2.3 | Конфигурация из .env |
| HTTP Client | httpx | ^0.27 | Async HTTP-клиент |
| File Storage | google-cloud-storage | ^3.10 | GCS для файлов и материалов |
| ML | scikit-learn | ^1.5 | Модель риска отчисления |
| ML | joblib | ^1.4 | Сериализация ML-модели |
| ML | numpy | ^2.0 | Числовые вычисления |
| Logging | structlog | ^24.1 | Структурированное логирование |
| Monitoring | sentry-sdk | ^2.0 | Мониторинг ошибок |

## Архитектура (Clean Architecture / DDD)

```
backend/
├── src/
│   ├── domain/                   Доменный слой (ядро)
│   │   ├── auth/
│   │   │   ├── entities.py         User, UserRole
│   │   │   └── policies.py        PasswordPolicy, UserCreationPolicy
│   │   ├── lms/
│   │   │   ├── entities.py         Student, Lesson, Group, Payment, 8 enums
│   │   │   ├── policies.py        RiskCalculationPolicy, PaymentOverduePolicy
│   │   │   └── events.py          Domain events (5 типов)
│   │   └── shared/
│   │       ├── entity.py           Entity, AggregateRoot
│   │       ├── events.py          DomainEvent base
│   │       └── value_objects.py   Email, Phone, Money, TimeRange, Grade
│   │
│   ├── application/              Прикладной слой (Use Cases)
│   │   ├── auth/
│   │   │   └── use_cases.py       Login, Refresh, CreateUser, ChangePassword
│   │   ├── lms/
│   │   │   └── students/
│   │   │       └── use_cases.py   CRUD + RecalculateRisk
│   │   └── interfaces/
│   │       └── repositories.py    Абстрактные репозитории (11 интерфейсов)
│   │
│   ├── api/                      API слой (FastAPI routers)
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
│   ├── infrastructure/           Инфраструктурный слой
│   │   ├── persistence/
│   │   │   ├── models/            ORM-модели (auth, lms 22 таблицы, crm, gamification)
│   │   │   └── repositories/     SQL-реализации репозиториев
│   │   ├── services/
│   │   │   ├── gamification_engine.py  Авто-начисление звёзд/кристаллов
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
│   ├── seed_full.py              Комплексный seed (200 студентов, 730 уроков)
│   ├── generate_risk_dataset.py  Генерация синтетического датасета
│   ├── train_risk_model.py       Обучение ML-модели
│   ├── run_ml_scoring.py         Ручной запуск ML-скоринга
│   └── recalc_gamification.py    Пересчёт геймификации
│
├── alembic/                      Миграции БД
├── tests/                        292 unit-теста
├── pyproject.toml                Poetry dependencies
├── Dockerfile                    Multi-stage build (python:3.13-slim)
└── README.md                     (этот файл)
```

## Запуск

```bash
# Docker
docker compose up -d --build api

# Миграции
docker compose exec api alembic upgrade head

# Dev (локально)
cd backend
poetry install
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

Swagger UI: http://localhost:8000/docs

| Группа | Prefix | Описание |
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

- **Алгоритм:** GradientBoostingClassifier + CalibratedClassifierCV
- **Признаки:** 14 (4 домена: attendance, grades, homework, payment)
- **ROC-AUC:** 0.93
- **Обучение:** 5000 синтетических профилей, 5 архетипов

## Тесты

```bash
cd backend
poetry run pytest tests/unit/ -v
```
