# EduPlatform — Claude Context

## Project Overview

Education platform with 3 frontends (Next.js 14) + 1 backend (FastAPI/Python 3.13) + infrastructure (PostgreSQL, Redis, RabbitMQ, MinIO).

## Architecture

```
eduplatform/
├── backend/          FastAPI, Python 3.13, Poetry, Clean Architecture
├── crm/              Next.js 14 — CRM for sales (port 3000)
├── logbook/          Next.js 14 — Teacher logbook (port 3001)
├── student/          Next.js 14 — Student portal (port 3002)
└── docker-compose.yml
```

**Backend stack:** FastAPI 0.115 + SQLAlchemy 2 (async) + Alembic + Celery + Redis + RabbitMQ + MinIO (S3)
**Frontend stack:** Next.js 14 + TypeScript + TanStack Query + Zustand + Tailwind + Radix UI + shadcn

## Running

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed.py"
```

Ports: API :8000, CRM :3000, Logbook :3001, Student :3002

Infrastructure ports are NOT exposed to host (avoid conflicts with local services).

## Backend Domain Layer (DDD)

Structure per subdomain: `entities.py`, `value_objects.py`, `specifications.py`, `policies.py`, `events.py`

```
domain/
├── shared/
│   ├── entity.py            Entity, AggregateRoot (with domain events)
│   ├── events.py            DomainEvent base class
│   ├── value_objects.py     Email, Phone, Money, TimeRange, Grade
│   └── specification.py     Specification[T] with &, |, ~ combinators
├── auth/
│   ├── entities.py          User, UserRole enum
│   ├── value_objects.py     Password (Apple-style validation via specs)
│   ├── specifications.py    IsActiveUserSpec, IsStaffSpec + password specs:
│   │                        MinLengthSpec, HasUppercaseSpec, HasLowercaseSpec,
│   │                        HasDigitSpec, HasSpecialCharSpec, NoWhitespaceOnlySpec,
│   │                        STRONG_PASSWORD_SPEC (composite), PASSWORD_RULES
│   └── policies.py          UserCreationPolicy, PasswordPolicy
├── lms/
│   ├── entities.py          Student (risk→policy), Lesson, Payment, Group, etc.
│   ├── value_objects.py     StudentCode, Percentage
│   ├── specifications.py    StudentAtRiskSpec, HighRiskStudentSpec,
│   │                        OverduePaymentSpec, LessonConductibleSpec, LessonCancellableSpec
│   ├── policies.py          RiskCalculationPolicy, PaymentOverduePolicy
│   └── events.py            LessonConducted, LessonCancelled, StudentRiskChanged, etc.
├── crm/
│   ├── entities.py          Lead (transitions→policy), Funnel, Stage (HexColor, WinProbability VOs), CrmTask
│   ├── value_objects.py     WinProbability, HexColor
│   ├── specifications.py    ActiveLeadSpec, OverdueTaskSpec, StageBelongsToFunnelSpec
│   ├── policies.py          LeadTransitionPolicy
│   └── events.py            LeadCreated, LeadWon, LeadLost, LeadStageMoved, etc.
└── gamification/
    ├── entities.py          Achievement (uses Reward VO), StudentAchievement
    ├── value_objects.py     Reward (stars + crystals bundle)
    ├── specifications.py    AchievementTriggeredSpec
    └── events.py            AchievementUnlocked, StarsEarned, CrystalsEarned
```

## API Routes (178 total)

### Auth
- POST /auth/login, /auth/logout, /auth/refresh, /auth/me, /auth/change-password
- POST /auth/users (create user — director only)

### LMS (prefix /lms)
- /lms/directions, /lms/subjects, /lms/rooms — CRUD
- /lms/students — CRUD + risk recalculation
- /lms/groups — CRUD + /{id}/lessons
- /lms/lessons — CRUD + /{id}/conduct, /{id}/cancel, /{id}/materials
- /lms/enrollments, /lms/attendance, /lms/homework, /lms/grades, /lms/payments
- /lms/mup-tasks, /lms/compensation, /lms/late-requests
- /lms/users, /lms/analytics

### CRM (prefix /crm)
- /crm/leads — full CRUD + /move-stage, /assign, /mark-won, /mark-lost, /timeline
- /crm/lead-sources — CRUD + /regenerate-key (auto api_key for api/landing types)
- /crm/contacts — list + get (auto-created when lead is created)
- /crm/funnels — CRUD + /archive + /{id}/stages + /{id}/custom-fields
- /crm/tasks — CRUD + /move, /complete
- /crm/activities, /crm/notifications
- /crm/users — list + create + update (managers management)
- /crm/analytics — overview, sources, managers, funnel-conversion, leads-over-time, loss-reasons, sankey, forecast

### Public (no auth)
- GET  /public/forms/{api_key} — landing form config (fields from funnel custom fields)
- POST /public/forms/{api_key}/submit — landing form submission
- POST /public/api/{api_key}/leads — external API lead submission

### Student Portal (prefix /student)
- /student/schedule, /student/leaderboard, /student/assignments, /student/subjects
- /student/performance/{subject_id}, /student/materials, /student/contacts

### Other
- /notifications — unified LMS + CRM notifications
- /gamification — achievements, student achievements, activity feed
- /files — S3 presigned upload

## Lead Sources (4 types)

| Type | api_key | funnel_id | Description |
|------|---------|-----------|-------------|
| manual | — | optional | Manager enters leads manually |
| import | — | optional | CSV upload |
| api | auto-generated | required | External systems POST to /public/api/{key}/leads |
| landing | auto-generated | required | Public form at /public/forms/{key}, custom fields from funnel |

When a lead is created (any method), a CRM contact is auto-created/linked by phone number.

## Password Validation (Apple-style)

Uses specification pattern — each rule is a separate spec, combined with `&`:
- MinLengthSpec (8 chars)
- HasUppercaseSpec (A-Z)
- HasLowercaseSpec (a-z)
- HasDigitSpec (0-9)
- HasSpecialCharSpec (!@#$%^&*...)
- NoWhitespaceOnlySpec

Password VO and PasswordPolicy both use PASSWORD_RULES list to collect all unmet requirements.

## Tests (292 unit tests)

```
tests/unit/domain/test_shared.py            28 tests  — Email, Phone, Money, TimeRange, Grade, Specification combinators
tests/unit/domain/test_auth_domain.py       96 tests  — Password VO, all password specs, IsActiveUser, IsStaff, UserCreationPolicy, PasswordPolicy
tests/unit/domain/test_auth_entities.py      4 tests  — User entity
tests/unit/domain/test_lms_domain.py        47 tests  — StudentCode, Percentage, RiskCalculationPolicy, PaymentOverduePolicy, all LMS specs
tests/unit/domain/test_lms_entities.py      17 tests  — Student, Lesson, Payment entities
tests/unit/domain/test_crm_domain.py        30 tests  — WinProbability, HexColor, LeadTransitionPolicy, all CRM specs
tests/unit/domain/test_crm_entities.py      22 tests  — Lead, Funnel, Stage, CrmTask entities
tests/unit/domain/test_gamification_domain.py 20 tests — Reward VO, AchievementTriggeredSpec
tests/unit/domain/test_gamification_entities.py 5 tests — Achievement, StudentAchievement
tests/unit/application/test_auth_use_cases.py 11 tests — Login, CreateUser, ChangePassword use cases
tests/unit/application/lms/*                  6 tests
tests/unit/application/crm/*                  6 tests
```

Run: `cd backend && poetry run pytest tests/unit/ -v`

## Key Technical Decisions

### FastAPI 0.115 + `from __future__ import annotations` + 204 status
All 204 routes use `-> Response:` return type and `return Response(status_code=204)`.
Do NOT use `status_code=HTTP_204_NO_CONTENT` in decorator — it breaks with future annotations.

### Zustand hydration fix
All 3 frontends use `_hasHydrated` flag with `onRehydrateStorage` callback.
Layouts wait for hydration before checking auth. `isAuthenticated` is computed as `!!token && !!user` (not stored).

### Password hashing
Uses `bcrypt` directly (not passlib) — passlib has compatibility issues with bcrypt 4.x on Python 3.13.
See `backend/src/infrastructure/services/password_service.py`.

### Docker
- Backend Dockerfile: Python 3.13-slim, needs `g++` for greenlet compilation
- Frontend Dockerfiles: `mkdir -p public` before build (some apps have no public dir)
- CRM demo files have `// @ts-nocheck` (type mismatches in mock data)

### DB enum handling
All SAEnum in models use `create_type=False`. Enums are created in migration via `op.execute()`.
Migration 0001 does NOT use `DO $$ BEGIN ... EXCEPTION` blocks — SQLAlchemy handles type creation via `_on_table_create`.

## Seed Data

```bash
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed.py"
```

Accounts:
- director@edu.uz / director123 (director)
- sales1@edu.uz / sales123 (sales_manager)
- sales2@edu.uz / sales123 (sales_manager)
- teacher1@edu.uz / teacher123 (teacher)
- teacher2@edu.uz / teacher123 (teacher)
- mup@edu.uz / mup12345 (mup)
- cashier@edu.uz / cashier123 (cashier)
- student1@edu.uz / student123 (student)
- student2@edu.uz / student123 (student)
- student3@edu.uz / student123 (student)

Also seeds: 2 directions, 2 subjects, 2 rooms, 2 groups, 3 students, 3 enrollments.

## Frontend-Backend Field Mapping

### CRM Analytics Overview
Backend returns: `totalTasks, completedTasks, completedTasksPercent, overdueTasks, newLeads, wonLeads, avgResponseTimeHours, delta.{newLeads, wonLeads, avgResponseTimeHours}`

### CRM Analytics Managers
Backend returns: `userId, userName, avatarUrl, leadsHandled, leadsWon, leadsLost, wonRate (0-1 float), avgResponseTimeHours`

### CRM Leads Pagination
Backend returns: `{ data: Lead[], total, page, limit, totalPages }` — matches frontend PaginatedResponse<T>

### CRM Tasks Pagination
Backend returns: `{ items: Task[], total, page, pages }` — frontend extracts `.items` via `r.data.items ?? r.data`

### Period parameter
Frontend sends: `week`, `month`, `quarter`, `year`, `custom` (with from/to).
Backend `_period_range()` handles all these values.
