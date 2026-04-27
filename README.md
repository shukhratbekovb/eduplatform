<h1 align="center">EduPlatform</h1>

<p align="center">
  <strong>Integrated Management Platform for IT Learning Centers</strong>
</p>

<p align="center">
  <a href="https://github.com/shukhratbekovb/eduplatform/actions/workflows/ci-cd.yml">
    <img src="https://github.com/shukhratbekovb/eduplatform/actions/workflows/ci-cd.yml/badge.svg" alt="CI/CD Pipeline" />
  </a>
  <a href="https://sonarcloud.io/summary/overall?id=shukhratbekovb_eduplatform">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=shukhratbekovb_eduplatform&metric=alert_status" alt="Quality Gate" />
  </a>
  <img src="https://img.shields.io/badge/python-3.13-blue" alt="Python" />
  <img src="https://img.shields.io/badge/Next.js-14-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/license-All%20Rights%20Reserved-red" alt="License" />
</p>

<p align="center">
  <a href="https://shukhratbekov.uz">Website</a> &middot;
  <a href="https://lms.shukhratbekov.uz">LMS</a> &middot;
  <a href="https://crm.shukhratbekov.uz">CRM</a> &middot;
  <a href="https://student.shukhratbekov.uz">Student Portal</a> &middot;
  <a href="https://api.shukhratbekov.uz/docs">API Docs</a>
</p>

---

> **BISP Final Year Project** (6BUIS007C-n)
> Westminster International University in Tashkent
> BSc (Hons) Business Information Systems
>
> **Author:** Shukhratbekov Boburbek (ID: 00016332)
> **Email:** shukhratbekovb@gmail.com

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Access Control](#access-control)
- [ML Risk Scoring](#ml-risk-scoring)
- [Gamification Engine](#gamification-engine)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

EduPlatform is a comprehensive management system designed for IT learning centers that teach programming, data science, cybersecurity, UI/UX, and other technology disciplines. The platform addresses three core operational areas through dedicated web applications:

| Application | Purpose | Users |
|---|---|---|
| **CRM** | Sales funnel, leads, contracts, conversion analytics | Sales managers, Director |
| **Logbook (LMS)** | Schedule, attendance, grading, homework, reports, finance | Teachers, Academic managers, Director, Cashier |
| **Student Portal** | Dashboard, grades, schedule, homework, gamification, payments | Students |

The backend provides a unified REST API with ML-powered dropout risk prediction, automated task generation via message queues, and a gamification engine that incentivizes student engagement.

### Key Metrics

| Metric | Value |
|--------|-------|
| Backend (Python) | ~25,000 LOC |
| Frontend (TypeScript) | ~35,000 LOC |
| Test Files | 29 (unit + integration) |
| API Endpoints | 90+ |
| Database Tables | 35+ |
| Docker Services | 8 (api, worker, beat, postgres, redis, rabbitmq, 4 frontends) |
| Seed Data | 200 students, 730 lessons, 4500+ grades, 200 contracts |

---

## Architecture

```
                                    Internet
                                       |
                                    Nginx (SSL)
                                       |
                 +-----+------+--------+--------+--------+
                 |      |      |        |        |        |
              Website  CRM  Logbook  Student    API    RabbitMQ
              :3003   :3000  :3001   :3002    :8000   Management
                 |      |      |        |        |
                 |      +------+--------+     +--+--+
                 |         Next.js 14          |     |
                 |                          Worker  Beat
                 |                          (Celery tasks)
                 |                             |
                 |        +--------------------+
                 |        |         |          |
                 |    PostgreSQL  Redis    RabbitMQ
                 |       :5432    :6379     :5672
                 |        |
                 |    Google Cloud
                 |     Storage
                 |    (files, materials)
                 |
              Next.js 14
           (Landing Page)
```

### Service Diagram

```
eduplatform/
├── backend/           Python 3.13 + FastAPI + SQLAlchemy 2 (async)
│   ├── src/
│   │   ├── api/       REST endpoints (v1)
│   │   ├── application/  Use cases (Clean Architecture)
│   │   ├── domain/    Entities, Value Objects, Policies, Specifications
│   │   ├── infrastructure/  ORM models, repositories, services
│   │   └── ml/        ML risk scoring (scikit-learn)
│   ├── alembic/       Database migrations
│   ├── scripts/       Seed, ML training, gamification recalc
│   └── tests/         Unit + Integration tests
├── crm/               Next.js 14 — CRM (port 3000)
├── logbook/           Next.js 14 — LMS Teacher Journal (port 3001)
├── student/           Next.js 14 — Student Portal (port 3002)
├── website/           Next.js 14 — Landing Page (port 3003)
├── e2e/               Playwright E2E tests
├── deploy/            Production deployment configs
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   └── setup.sh
└── .github/workflows/ CI/CD Pipeline (GitHub Actions)
```

---

## Tech Stack

### Backend

| Technology | Purpose | Version |
|---|---|---|
| Python | Runtime | 3.13 |
| FastAPI | Web framework | 0.115 |
| SQLAlchemy 2 | ORM (async) | 2.0 |
| asyncpg | PostgreSQL driver | 0.30 |
| Alembic | Database migrations | 1.13 |
| Celery | Task queue | 5.4 |
| RabbitMQ | Message broker | 3 |
| Redis | Cache + Celery backend | 7 |
| scikit-learn | ML dropout prediction | 1.5 |
| Pydantic v2 | Validation + Settings | 2.12 |
| python-jose | JWT authentication | 3.3 |
| Google Cloud Storage | File storage | 3.10 |

### Frontend

| Technology | Purpose | Version |
|---|---|---|
| Next.js | React framework | 14.2 |
| TypeScript | Type safety | 5.x |
| Tailwind CSS | Styling | 3.4 |
| Radix UI | Accessible components | latest |
| Zustand | State management | 4.x |
| Recharts | Charts and analytics | 2.x |
| date-fns | Date utilities | 3.x |
| jsPDF | PDF report generation | 2.x |
| Lucide Icons | Icon library | latest |

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerization |
| Nginx | Reverse proxy + SSL termination |
| Let's Encrypt (Certbot) | SSL certificates |
| GitHub Actions | CI/CD pipeline |
| SonarCloud | Code quality + coverage |
| Trivy | Container vulnerability scanning |
| Google Cloud (GCE) | Production hosting |

---

## Features

### CRM Module

- **Sales Funnels**: Kanban-style pipeline with customizable stages and win probabilities
- **Lead Management**: Manual entry, CSV import, API integration, landing page forms
- **Auto Contact Creation**: Contacts auto-created from phone numbers
- **Contracts**: Lead-to-student conversion, auto student account creation
- **Analytics**: Sankey diagrams, conversion rates, manager performance, source analysis
- **Notifications**: Task assignments, due dates, overdue alerts

### LMS Module (Logbook)

- **Groups & Lessons**: Direction-based groups, subject/teacher per lesson, conflict validation
- **Schedule**: Calendar view (hours 0-23), multi-select filters, lesson cards with details
- **Attendance**: Per-lesson marking (present/absent/late/excused), group attendance overview
- **Grading**: 10-point GPA scale, grade types (participation, homework, exam, quiz, project)
- **Homework**: Full flow — create assignment with files, auto-submissions, student upload, teacher review
- **Exams**: CRUD with auto subject resolution, exam grading modal
- **Late Entry Requests**: Teacher submits, MUP/Director approves, conduct window extended
- **Finance**: Auto payment schedule from contracts, partial payments, overdue detection, contract balance
- **Reports**: Teaching hours, student performance by group/direction, financial reports (income, debtors, forecast)
- **Staff Management**: Employee profiles, subject assignments, birthday/phone fields
- **Compensation**: Per-teacher rate models (hourly/fixed), salary calculations
- **Notifications**: Overdue debts, risk alerts, homework overdue (automated via Celery)
- **MUP Tasks**: Auto-generated from attendance streaks, payment overdue, high risk students

### Student Portal

- **Dashboard**: 7 widgets — stats cards, grades, attendance, today's schedule, deadlines, activity feed, leaderboard
- **Schedule**: Weekly view matching logbook calendar style
- **Performance**: Grade history with type labels (lesson/homework/exam), GPA tracking
- **Homework**: View assignments, download teacher files, upload submissions, track status
- **Materials**: Accordion by lesson, file download via GCS proxy
- **Payments**: 3 tabs (upcoming, by contract, history), balance cards, progress bars
- **Gamification**: Achievement catalog, reward shop, leaderboard, activity feed
- **Profile**: Password change, personal information

### Cross-Platform Features

- **Role-Based Access**: Platform-level guards (LMS, CRM, Student) + role-level permissions
- **Internationalization**: Full RU/EN support (~800 i18n keys across all apps)
- **File Management**: GCS upload with signed URLs, proxy download, Cyrillic filename support
- **Custom DatePicker**: 3-level navigation (days/months/years), Russian locale, min/max dates

---

## Getting Started

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Git
- GCS credentials file (for file uploads) — optional for local development

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/shukhratbekovb/eduplatform.git
cd eduplatform

# 2. Start all services
docker compose up -d --build

# 3. Run database migrations
docker compose exec api alembic upgrade head

# 4. Seed the database (200 students, 14 teachers, 30 groups, etc.)
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed_full.py"

# 5. Run ML risk scoring
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/run_ml_scoring.py"

# 6. Recalculate gamification (stars, crystals, badges, achievements)
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/recalc_gamification.py"
```

### Access the Applications

| Application | URL | Default Login |
|---|---|---|
| CRM | http://localhost:3000 | director@edu.uz / password123 |
| Logbook (LMS) | http://localhost:3001 | director@edu.uz / password123 |
| Student Portal | http://localhost:3002 | student1@edu.uz / password123 |
| API Documentation | http://localhost:8000/docs | — |

### All Test Accounts (password: `password123`)

| Role | Email | Platform Access |
|------|-------|----------------|
| Director | director@edu.uz | LMS + CRM |
| Academic Manager (MUP) | mup@edu.uz | LMS |
| Cashier | cashier@edu.uz | LMS |
| Sales Manager | sales@edu.uz | CRM |
| Teacher (Python) | t.python1@edu.uz | LMS |
| Teacher (JavaScript) | t.js1@edu.uz | LMS |
| Student | student1@edu.uz ... student200@edu.uz | Student Portal |

---

## Deployment

### Production Environment

The platform is deployed on Google Cloud Compute Engine with the following architecture:

- **Server**: e2-medium (2 vCPU, 4 GB RAM), Ubuntu 24.04
- **Domain**: shukhratbekov.uz with subdomains (crm, lms, student, api)
- **SSL**: Let's Encrypt with auto-renewal
- **Reverse Proxy**: Nginx with rate limiting, gzip, security headers
- **Docker Images**: Pre-built on Docker Hub (`shukhratbekovb/eduplatform-*`)

### Docker Hub Repositories

| Image | Repository |
|-------|-----------|
| Backend | `shukhratbekovb/eduplatform-backend:latest` |
| CRM | `shukhratbekovb/eduplatform-crm:latest` |
| Logbook | `shukhratbekovb/eduplatform-logbook:latest` |
| Student | `shukhratbekovb/eduplatform-student:latest` |
| Website | `shukhratbekovb/eduplatform-website:latest` |

### Deploy to a New Server

```bash
# 1. Clone the project
ssh root@YOUR_VPS_IP
cd /opt && git clone https://github.com/shukhratbekovb/eduplatform.git
cd eduplatform/deploy

# 2. Configure environment
cp .env.example .env && nano .env
cp .env.backend.example .env.backend && nano .env.backend

# 3. Place GCS credentials
scp gcp_keys.json root@VPS:/opt/eduplatform/deploy/

# 4. Run the setup script (installs Docker, Nginx, SSL, starts services)
chmod +x setup.sh && ./setup.sh your-email@domain.com
```

For detailed deployment instructions, see [deploy/README.md](deploy/README.md).

---

## CI/CD Pipeline

The project uses a **9-stage GitHub Actions pipeline** triggered on push to `main` and `develop`:

```
Install ──> Lint + Type Check ──> Unit Tests ──> Quality Gate (SonarQube)
                                       |
                                Integration Tests
                                       |
                            Build Docker Images + Trivy Scan
                                       |
                        ┌──────────────┴──────────────┐
                     develop                         main
                        |                              |
                  Deploy Staging                Deploy Production
                        |
                   E2E Tests (Playwright)
```

| Stage | Tools | Purpose |
|-------|-------|---------|
| Lint + Type Check | Ruff, mypy | Code quality enforcement |
| Unit Tests | pytest + coverage | 292 tests, coverage report |
| Quality Gate | SonarCloud | Coverage >= 80%, code smells |
| Integration Tests | pytest + PostgreSQL service | API endpoint testing |
| Build & Scan | Docker buildx, Trivy | Multi-platform images, vulnerability scan |
| Deploy | SSH + docker compose | Rolling restart, zero-downtime |
| E2E Tests | Playwright | Smoke tests, auth flows |

For CI/CD setup instructions, see [CI-CD-SETUP.md](CI-CD-SETUP.md).

---

## Testing

### Backend Tests

```bash
cd backend

# Run all unit tests
poetry run pytest tests/unit/ -v

# Run integration tests (requires PostgreSQL on port 5433)
poetry run pytest tests/integration/ -v

# Run with coverage
poetry run pytest tests/unit/ --cov=src --cov-report=html

# Lint
poetry run ruff check src/ tests/
poetry run ruff format --check src/ tests/

# Type check
poetry run mypy src/ --ignore-missing-imports
```

### E2E Tests

```bash
cd e2e
npm ci
npx playwright install --with-deps chromium
npx playwright test
```

### Test Structure

```
backend/tests/
├── unit/                    # Pure domain/application logic tests
│   ├── domain/              # Entity, policy, value object tests
│   │   ├── test_auth.py
│   │   ├── test_crm.py
│   │   ├── test_lms.py
│   │   ├── test_shared.py
│   │   └── test_gamification.py
│   └── application/         # Use case tests (mocked repositories)
│       ├── test_auth_use_cases.py
│       ├── crm/
│       └── lms/
└── integration/             # Full API tests with real database
    ├── api/crm/
    ├── api/lms/
    ├── api/student/
    └── repositories/
```

---

## Project Structure

### Backend (Clean Architecture / DDD)

```
backend/src/
├── api/                        # Presentation layer
│   ├── dependencies.py         # FastAPI dependency injection
│   └── v1/                     # API v1 routes
│       ├── auth/               # Authentication endpoints
│       ├── crm/                # CRM endpoints (funnels, leads, contracts, etc.)
│       ├── lms/                # LMS endpoints (groups, lessons, attendance, etc.)
│       └── student/            # Student portal endpoints
├── application/                # Application layer (use cases)
│   ├── auth/use_cases.py
│   ├── crm/                    # CRM business logic
│   ├── lms/                    # LMS business logic
│   └── interfaces/             # Repository interfaces (ports)
├── domain/                     # Domain layer (entities, value objects, policies)
│   ├── auth/                   # User, Email, Password policies
│   ├── crm/                    # Lead, Funnel, Contract entities
│   ├── lms/                    # Student, Lesson, Group entities
│   ├── gamification/           # Stars, Crystals, Badges, Achievements
│   └── shared/                 # Base Entity, ValueObject, Specification
├── infrastructure/             # Infrastructure layer
│   ├── persistence/
│   │   ├── models/             # SQLAlchemy ORM models
│   │   └── repositories/      # Repository implementations
│   ├── services/               # JWT, Password, Storage, Gamification
│   └── workers/                # Celery tasks (risk, notifications, auto-tasks)
├── ml/                         # Machine Learning module
│   ├── feature_extractor.py    # 14 features from 4 domains
│   ├── predictor.py            # Model loading + prediction
│   └── risk_scorer.py          # Orchestrator
├── config.py                   # Pydantic Settings
├── database.py                 # Async engine + session factory
└── main.py                     # FastAPI app factory
```

### Frontend (shared structure across crm, logbook, student)

```
{app}/src/
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Login page
│   └── (dashboard)/            # Protected layout + pages
├── components/                 # Reusable UI components
├── lib/
│   ├── api.ts                  # API client (fetch wrapper)
│   └── store/                  # Zustand stores (auth, i18n)
├── i18n/                       # Translation files (ru.ts, en.ts)
└── types/                      # TypeScript type definitions
```

---

## Access Control

### Platform-Level Guards

Access is enforced at the router level via FastAPI dependencies:

| Platform | Allowed Roles | Guard |
|----------|--------------|-------|
| LMS (Logbook) | Director, MUP, Teacher, Cashier | `lms_platform_guard` |
| CRM | Director, Sales Manager | `crm_platform_guard` |
| Student Portal | Student | `student_platform_guard` |

### Role-Specific Restrictions

| Feature | Director | MUP | Teacher | Cashier |
|---------|:--------:|:---:|:-------:|:-------:|
| Conduct lessons | - | - | Yes | - |
| Approve late requests | Yes | Yes | - | - |
| View finance | Yes | - | - | Yes |
| View all students | Yes | Yes | Filtered | - |
| Manage staff | Yes | - | - | - |

---

## ML Risk Scoring

### Model

- **Algorithm**: GradientBoostingClassifier + CalibratedClassifierCV
- **ROC-AUC**: 0.93
- **Training data**: 5,000 synthetic students across 5 archetypes

### Features (14 total)

| Domain | Features |
|--------|----------|
| Attendance (4) | rate, absent_count, late_count, consecutive_absences |
| Grades (4) | gpa, avg_score, grade_trend, low_grade_count |
| Homework (3) | completion_rate, on_time_rate, avg_hw_score |
| Payments (3) | overdue_count, overdue_amount, payment_regularity |

### Risk Levels

| Level | Probability | Action |
|-------|------------|--------|
| LOW | < 25% | No action |
| MEDIUM | 25-50% | Monitor |
| HIGH | 50-75% | Auto-task for MUP |
| CRITICAL | > 75% | Auto-task + notification |

### Execution

- **Nightly batch**: Celery task recalculates all students
- **Event-driven**: Triggered after lesson conduct via RabbitMQ
- **API**: `GET /students/{id}/risk` returns detailed breakdown

---

## Gamification Engine

### Points System

| Event | Stars | Crystals |
|-------|:-----:|:--------:|
| Present at lesson | +5 | - |
| Late to lesson | -2 | - |
| Grade 9-10 (lesson) | +10 | - |
| Grade 7-8 (lesson) | +5 | - |
| Homework on time | +15 | - |
| Homework grade 9-10 | +20 | - |
| 5 consecutive present | - | +5 |
| 10 consecutive present | - | +15 |
| Teacher manual award | - | Variable |

### Progression

| Badge | Stars Required |
|-------|:-------------:|
| Bronze | 0 |
| Silver | 100 |
| Gold | 300 |
| Platinum | 600 |
| Diamond | 1,000 |

### Achievements (7)

`first_grade`, `five_tens`, `gpa_9`, `ten_present`, `thirty_present`, `ten_homework`, `leaderboard_first`

### Reward Shop

Students spend stars/crystals on items: sticker packs, certificates, discounts, t-shirts, free lessons.

---

## API Documentation

Interactive API documentation is available at:

- **Swagger UI**: https://api.shukhratbekov.uz/docs (or `http://localhost:8000/docs` locally)

### Key Endpoints

| Group | Endpoints | Description |
|-------|-----------|-------------|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` | JWT authentication |
| Students | `GET /lms/students`, `GET /students/{id}/risk` | Student CRUD + risk |
| Groups | `GET /lms/groups`, `POST /lms/groups` | Group management |
| Lessons | `GET /lms/lessons`, `POST /lms/lessons/conduct` | Schedule + conduct |
| Attendance | `GET /lms/attendance` | Attendance records |
| Grades | `GET /lms/grades` | Grade records |
| Homework | `GET /lms/homework`, `POST /homework/submissions` | Assignment flow |
| Finance | `GET /lms/payments`, `POST /payments/{id}/pay` | Payment management |
| Reports | `GET /lms/reports/teaching-hours`, `GET /lms/reports/finance/*` | Analytics |
| CRM | `GET /crm/funnels`, `GET /crm/leads`, `POST /crm/contracts` | Sales pipeline |
| Gamification | `GET /gamification/dashboard`, `POST /gamification/shop/purchase` | Student rewards |
| Files | `POST /files/upload`, `GET /files/download` | GCS file management |
| Public | `POST /public/website-lead`, `POST /public/forms/{key}/submit` | Landing page API |

---

## Currency

**UZS (Uzbek som)** is the only currency used throughout the platform.

---

## License

This project was developed as a final year capstone project (BISP, module 6BUIS007C-n) for BSc (Hons) Business Information Systems at Westminster International University in Tashkent. Copyright belongs to the University of Westminster, UK, as per university regulations.

All rights reserved. Commercial use requires permission from the University.
