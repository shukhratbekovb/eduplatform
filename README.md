# EduPlatform

Платформа управления IT-учебным центром. Дипломный проект (BISP).

**Автор:** Шухратбеков Бобурбек ([shukhratbekovb@gmail.com](mailto:shukhratbekovb@gmail.com))

## О проекте

EduPlatform — полнофункциональная платформа для управления IT-учебным центром, включающая три веб-приложения и единый бэкенд с ML-компонентом:

- **[CRM](crm/README.md)** — управление воронками продаж, лидами, договорами
- **[Logbook (LMS)](logbook/README.md)** — журнал преподавателя, расписание, аналитика, отчёты
- **[Student Portal](student/README.md)** — личный кабинет студента с расписанием, оценками, геймификацией
- **[Backend API](backend/README.md)** — FastAPI + PostgreSQL + ML-скоринг риска отчисления

## Архитектура

```
eduplatform/
├── backend/          FastAPI + Clean Architecture + ML     (port 8000)
├── crm/              Next.js 14 — CRM для продажников      (port 3000)
├── logbook/          Next.js 14 — Журнал преподавателя      (port 3001)
├── student/          Next.js 14 — Портал студента           (port 3002)
├── docker-compose.yml
└── README.md         (этот файл)
```

### Стек технологий

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Backend | Python + FastAPI + SQLAlchemy 2 (async) | 3.13 / 0.115 |
| ML | scikit-learn (GradientBoosting) | 1.5 |
| Task Queue | Celery + RabbitMQ | 5.4 |
| Database | PostgreSQL | 16 |
| Cache/Backend | Redis | 7 |
| Frontends | Next.js + TypeScript + Tailwind CSS | 14.2 |
| UI библиотека | Radix UI + Lucide Icons + Recharts | — |
| File Storage | Google Cloud Storage | — |
| Контейнеризация | Docker + Docker Compose | — |

## Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone git@github.com:shukhratbekovb/eduplatform.git
cd eduplatform

# 2. Запуск всех сервисов
docker compose up -d --build

# 3. Заполнение базы данных (200 студентов, 730 уроков, и т.д.)
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed_full.py"

# 4. Запуск ML-скоринга риска
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/run_ml_scoring.py"

# 5. Пересчёт геймификации
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/recalc_gamification.py"
```

## Доступ

| Приложение | URL | Логин | Пароль |
|---|---|---|---|
| CRM | http://localhost:3000 | director@edu.uz | password123 |
| Logbook (LMS) | http://localhost:3001 | director@edu.uz | password123 |
| Student Portal | http://localhost:3002 | student1@edu.uz | password123 |
| API Docs (Swagger) | http://localhost:8000/docs | — | — |
| PostgreSQL (PgAdmin) | localhost:5433 | edu / edu | DB: eduplatform |

### Учётные записи

| Роль | Email | Пароль |
|------|-------|--------|
| Директор | director@edu.uz | password123 |
| МУП | mup@edu.uz | password123 |
| Кассир | cashier@edu.uz | password123 |
| Менеджер продаж | sales@edu.uz | password123 |
| Преподаватель (Python) | t.python1@edu.uz | password123 |
| Студент | student1@edu.uz | password123 |

### Матрица доступа

| Роль | Logbook (LMS) | CRM | Student Portal |
|---|:---:|:---:|:---:|
| Директор | ✅ | ✅ | ❌ |
| МУП | ✅ | ❌ | ❌ |
| Преподаватель | ✅ | ❌ | ❌ |
| Кассир | ✅ | ❌ | ❌ |
| Менеджер продаж | ❌ | ✅ | ❌ |
| Студент | ❌ | ❌ | ✅ |

## Ключевые фичи

### ML Risk Scoring (Прогнозирование отчисления)
- 14 признаков из 4 доменов: посещаемость, оценки, домашки, платежи
- Модель: GradientBoostingClassifier (scikit-learn), ROC-AUC **0.93**
- 4 уровня риска: LOW / MEDIUM / HIGH / CRITICAL
- Автопересчёт: ночной batch (Celery) + событийный (после conduct-урока)
- UI: прогресс-бар вероятности + 4 доменные карточки на странице студента

### Геймификация
- Звёзды: +5 за посещение, +10 за оценку 9-10, +15 за сданную домашку
- Кристаллы: +5 за 5 посещений подряд, +15 за 10 подряд
- Значки: Bronze → Silver(100⭐) → Gold(300) → Platinum(600) → Diamond(1000)
- 7 достижений, магазин наград

### Автоматические задачи МУП
- 3+ пропусков подряд → задача "Связаться с родителями"
- Задолженность > 30 дней → задача "Обсудить оплату"
- HIGH/CRITICAL риск → задача "Провести беседу"
- Триггер через RabbitMQ после каждого conduct-урока

### Мультиязычность (i18n)
- Полная поддержка RU/EN в Logbook (~500 ключей) и Student Portal (~300 ключей)
- Zustand persist + localStorage для сохранения выбора

### Уведомления
- Единый API: объединяет LMS + CRM уведомления
- Авто-уведомления: задолженности, риски, просроченные ДЗ
- Колокольчик с badge + полная страница `/notifications`

## Валюта

**UZS (узбекский сум)** — единственная валюта платформы.

## Лицензия

Дипломный проект (BISP). Все права защищены.
