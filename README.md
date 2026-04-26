# EduPlatform

Management platform for an IT learning center. Capstone project (BISP).

**Author:** Shukhratbekov Boburbek ([shukhratbekovb@gmail.com](mailto:shukhratbekovb@gmail.com))

## About the Project

EduPlatform is a full-featured platform for managing an IT learning center, consisting of three web applications and a unified backend with an ML component:

- **[CRM](crm/README.md)** — sales funnel management, leads, contracts
- **[Logbook (LMS)](logbook/README.md)** — teacher's journal, schedule, analytics, reports
- **[Student Portal](student/README.md)** — student dashboard with schedule, grades, gamification
- **[Backend API](backend/README.md)** — FastAPI + PostgreSQL + ML dropout risk scoring

## Architecture

```
eduplatform/
├── backend/          FastAPI + Clean Architecture + ML     (port 8000)
├── crm/              Next.js 14 — CRM for sales managers   (port 3000)
├── logbook/          Next.js 14 — Teacher's journal         (port 3001)
├── student/          Next.js 14 — Student portal            (port 3002)
├── docker-compose.yml
└── README.md         (this file)
```

### Tech Stack

| Component | Technology | Version |
|-----------|-----------|--------|
| Backend | Python + FastAPI + SQLAlchemy 2 (async) | 3.13 / 0.115 |
| ML | scikit-learn (GradientBoosting) | 1.5 |
| Task Queue | Celery + RabbitMQ | 5.4 |
| Database | PostgreSQL | 16 |
| Cache/Backend | Redis | 7 |
| Frontends | Next.js + TypeScript + Tailwind CSS | 14.2 |
| UI Library | Radix UI + Lucide Icons + Recharts | — |
| File Storage | Google Cloud Storage | — |
| Containerization | Docker + Docker Compose | — |

## Quick Start

```bash
# 1. Clone the repository
git clone git@github.com:shukhratbekovb/eduplatform.git
cd eduplatform

# 2. Start all services
docker compose up -d --build

# 3. Seed the database (200 students, 730 lessons, etc.)
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed_full.py"

# 4. Run ML risk scoring
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/run_ml_scoring.py"

# 5. Recalculate gamification
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/recalc_gamification.py"
```

## Access

| Application | URL | Login | Password |
|---|---|---|---|
| CRM | http://localhost:3000 | director@edu.uz | password123 |
| Logbook (LMS) | http://localhost:3001 | director@edu.uz | password123 |
| Student Portal | http://localhost:3002 | student1@edu.uz | password123 |
| API Docs (Swagger) | http://localhost:8000/docs | — | — |
| PostgreSQL (PgAdmin) | localhost:5433 | edu / edu | DB: eduplatform |

### User Accounts

| Role | Email | Password |
|------|-------|--------|
| Director | director@edu.uz | password123 |
| Academic Manager (MUP) | mup@edu.uz | password123 |
| Cashier | cashier@edu.uz | password123 |
| Sales Manager | sales@edu.uz | password123 |
| Teacher (Python) | t.python1@edu.uz | password123 |
| Student | student1@edu.uz | password123 |

### Access Matrix

| Role | Logbook (LMS) | CRM | Student Portal |
|---|:---:|:---:|:---:|
| Director | ✅ | ✅ | ❌ |
| Academic Manager (MUP) | ✅ | ❌ | ❌ |
| Teacher | ✅ | ❌ | ❌ |
| Cashier | ✅ | ❌ | ❌ |
| Sales Manager | ❌ | ✅ | ❌ |
| Student | ❌ | ❌ | ✅ |

## Key Features

### ML Risk Scoring (Dropout Prediction)
- 14 features across 4 domains: attendance, grades, homework, payments
- Model: GradientBoostingClassifier (scikit-learn), ROC-AUC **0.93**
- 4 risk levels: LOW / MEDIUM / HIGH / CRITICAL
- Auto-recalculation: nightly batch (Celery) + event-driven (after lesson conduct)
- UI: probability progress bar + 4 domain cards on the student profile page

### Gamification
- Stars: +5 for attendance, +10 for grade 9-10, +15 for submitted homework
- Crystals: +5 for 5 consecutive attendances, +15 for 10 consecutive
- Badges: Bronze → Silver(100⭐) → Gold(300) → Platinum(600) → Diamond(1000)
- 7 achievements, reward shop

### Automated Academic Manager Tasks
- 3+ consecutive absences → task "Contact parents"
- Debt overdue > 30 days → task "Discuss payment"
- HIGH/CRITICAL risk → task "Conduct an intervention meeting"
- Triggered via RabbitMQ after each lesson conduct

### Internationalization (i18n)
- Full RU/EN support in Logbook (~500 keys) and Student Portal (~300 keys)
- Zustand persist + localStorage to save language preference

### Notifications
- Unified API: combines LMS + CRM notifications
- Auto-notifications: overdue debts, risks, overdue homework
- Bell icon with badge + full `/notifications` page

## Currency

**UZS (Uzbek som)** — the only currency used on the platform.

## License

Capstone project (BISP). All rights reserved.
