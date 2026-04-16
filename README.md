# EduPlatform

Образовательная платформа с LMS, CRM и студенческим порталом.

## Архитектура

| Сервис | Описание | Порт |
|---|---|---|
| **API** | FastAPI backend | 8000 |
| **CRM** | CRM для отдела продаж | 3000 |
| **Logbook** | Журнал для преподавателей | 3001 |
| **Student Portal** | Портал для студентов | 3002 |
| **PostgreSQL** | База данных | 5432 |
| **Redis** | Кеш и очереди | 6379 |
| **RabbitMQ** | Message broker | 5672 / 15672 (UI) |
| **MinIO** | Файловое хранилище (S3) | 9000 / 9001 (UI) |

---

## Быстрый старт (Docker)

### 1. Требования

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2
- Git

### 2. Клонировать репозиторий

```bash
git clone <repo-url>
cd eduplatform
```

### 3. Настроить переменные окружения

```bash
cp backend/.env.example backend/.env
```

Открыть `backend/.env` и заполнить обязательные поля:

```env
DATABASE_URL=postgresql+asyncpg://edu:edu@postgres:5432/eduplatform
REDIS_URL=redis://redis:6379/0
RABBITMQ_URL=amqp://edu:edu@rabbitmq:5672/
SECRET_KEY=your-secret-key-min-32-chars
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=eduplatform-files
```

### 4. Запустить все сервисы

```bash
docker compose up -d
```

Первый запуск займёт несколько минут — Docker скачает образы и соберёт фронтенды.

### 5. Применить миграции базы данных

```bash
docker compose exec api alembic upgrade head
```

### 6. Создать администратора (опционально)

```bash
docker compose exec api poetry run python -m scripts.seed
```

### 7. Открыть в браузере

- API документация: http://localhost:8000/docs
- CRM: http://localhost:3000
- Logbook (журнал): http://localhost:3001
- Student Portal: http://localhost:3002
- MinIO Console: http://localhost:9001 (login: `minioadmin` / `minioadmin`)
- RabbitMQ UI: http://localhost:15672 (login: `edu` / `edu`)

---

## Локальная разработка (без Docker)

### Требования

- Python 3.13+
- [Poetry](https://python-poetry.org/docs/#installation)
- Node.js 20+
- PostgreSQL 16, Redis 7, RabbitMQ 3

### Backend

```bash
cd backend

# Установить зависимости
poetry install

# Настроить .env (DATABASE_URL указывает на локальный postgres)
cp .env.example .env

# Применить миграции
poetry run alembic upgrade head

# Запустить сервер
poetry run uvicorn src.main:app --reload --port 8000
```

Celery worker (в отдельном терминале):

```bash
cd backend
poetry run celery -A src.infrastructure.workers.celery_app worker --loglevel=info -Q default,notifications
```

Celery beat (scheduler, в отдельном терминале):

```bash
cd backend
poetry run celery -A src.infrastructure.workers.celery_app beat --loglevel=info
```

### Фронтенды

Каждый фронтенд запускается отдельно. В каждом нужен файл `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**CRM** (порт 3000):

```bash
cd crm
npm install
npm run dev
```

**Logbook** (порт 3001):

```bash
cd logbook
npm install
npm run dev -- -p 3001
```

**Student Portal** (порт 3002):

```bash
cd student
npm install
npm run dev -- -p 3002
```

---

## Управление через Makefile

Из директории `backend/`:

```bash
make help           # Список всех команд

make up             # Запустить Docker Compose
make down           # Остановить
make logs           # Логи всех сервисов
make build          # Пересобрать образы

make migrate        # Применить миграции
make migrate-down   # Откатить последнюю миграцию
make migrate-create MSG="add table"  # Создать новую миграцию

make test           # Запустить все тесты
make test-cov       # Тесты с отчётом о покрытии
make lint           # Проверка кода
make format         # Форматирование кода
```

---

## Структура проекта

```
eduplatform/
├── backend/          # FastAPI (Python 3.13 + Poetry)
│   ├── src/
│   │   ├── api/      # HTTP роутеры (v1)
│   │   ├── application/  # Use cases
│   │   ├── domain/   # Бизнес-сущности
│   │   └── infrastructure/  # БД, кеш, воркеры
│   ├── alembic/      # Миграции
│   └── tests/
├── crm/              # Next.js 15 — CRM для продаж
├── logbook/          # Next.js 15 — Журнал занятий
├── student/          # Next.js 15 — Портал студента
└── docker-compose.yml
```

---

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | PostgreSQL (asyncpg) | `postgresql+asyncpg://edu:edu@postgres:5432/eduplatform` |
| `REDIS_URL` | Redis | `redis://redis:6379/0` |
| `RABBITMQ_URL` | RabbitMQ AMQP | `amqp://edu:edu@rabbitmq:5672/` |
| `SECRET_KEY` | JWT секрет (≥32 символа) | `changeme-in-production-32chars!!` |
| `MINIO_ENDPOINT` | MinIO S3 адрес | `minio:9000` |
| `MINIO_ACCESS_KEY` | MinIO логин | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO пароль | `minioadmin` |
| `MINIO_BUCKET` | Имя бакета | `eduplatform-files` |
| `NEXT_PUBLIC_API_URL` | API URL для фронтендов | `http://localhost:8000/api/v1` |
