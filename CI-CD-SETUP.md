# CI/CD Pipeline — Инструкция по настройке

## Оглавление

1. [Обзор pipeline](#обзор-pipeline)
2. [Настройка GitHub Secrets](#настройка-github-secrets)
3. [Docker Hub Token](#1-dockerhub_token)
4. [SonarQube / SonarCloud](#2-sonar_token--sonar_host_url)
5. [SSH ключи для деплоя](#3-prod_host--prod_user--prod_ssh_key)
6. [Staging сервер (опционально)](#4-staging_host--staging_user--staging_ssh_key)
7. [Тестовый пароль](#5-test_user_password)
8. [Подготовка сервера](#подготовка-сервера)
9. [Как работает pipeline](#как-работает-pipeline)
10. [Troubleshooting](#troubleshooting)

---

## Обзор pipeline

```
push to main/develop
        │
   ┌────┴────┐
   ▼         ▼
 Lint    Unit Tests ──▸ Quality Gate (SonarQube)
   │         │
   └────┬────┘
        ▼
 Integration Tests
        │
        ▼
 Build Images + Trivy Scan (5 образов параллельно)
        │
   ┌────┴──────────┐
   │ develop       │ main
   ▼               ▼
 Deploy         Deploy
 Staging        Production
   │
   ▼
 E2E Tests
 (Playwright)
```

---

## Настройка GitHub Secrets

Все секреты добавляются в:

**GitHub → Repository → Settings → Secrets and variables → Actions → New repository secret**

---

### 1. `DOCKERHUB_TOKEN`

Docker Hub Access Token для пуша образов.

**Где получить:**

1. Зайди на https://hub.docker.com
2. Логин: `shukhratbekovb`
3. Нажми на аватар → **Account Settings**
4. Слева: **Security** → **Personal access tokens**
5. Нажми **Generate New Token**
6. Название: `github-actions-eduplatform`
7. Права: **Read & Write**
8. Нажми **Generate** и скопируй токен

**В GitHub:**
- Name: `DOCKERHUB_TOKEN`
- Secret: `dckr_pat_xxxxxxxxxxxxx` (скопированный токен)

---

### 2. `SONAR_TOKEN` + `SONAR_HOST_URL`

Для Quality Gate (покрытие кода >= 80%).

#### Вариант А: SonarCloud (бесплатно для open-source)

1. Зайди на https://sonarcloud.io
2. Логин через GitHub
3. **Import organization** → выбери свой GitHub аккаунт
4. **Analyze new project** → выбери `eduplatform`
5. Перейди в **My Account** → **Security** → **Generate Tokens**
6. Название: `github-actions`
7. Скопируй токен

**В GitHub:**
- `SONAR_TOKEN` → скопированный токен
- `SONAR_HOST_URL` → `https://sonarcloud.io`

#### Вариант Б: Self-hosted SonarQube

Если у тебя свой сервер SonarQube:

1. Зайди в SonarQube → **Administration** → **Security** → **Users**
2. Найди своего пользователя → **Tokens** → **Generate**
3. Название: `github-actions`

**В GitHub:**
- `SONAR_TOKEN` → сгенерированный токен
- `SONAR_HOST_URL` → `https://sonarqube.your-domain.com`

#### Вариант В: Пропустить SonarQube

Если пока не нужен — pipeline продолжит работу, но stage 4 упадёт. Можно закомментировать job `quality-gate` в `ci-cd.yml` до настройки.

---

### 3. `PROD_HOST` + `PROD_USER` + `PROD_SSH_KEY`

SSH доступ к продакшн серверу для автоматического деплоя.

#### Шаг 1: Создай SSH ключ для CI/CD

На **своём компьютере** (не на сервере):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/eduplatform_deploy -N ""
```

Это создаст два файла:
- `~/.ssh/eduplatform_deploy` — приватный ключ (для GitHub)
- `~/.ssh/eduplatform_deploy.pub` — публичный ключ (для сервера)

#### Шаг 2: Добавь публичный ключ на сервер

```bash
ssh shukhratbekovb@34.1.238.7 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys" < ~/.ssh/eduplatform_deploy.pub
```

Проверь что работает:
```bash
ssh -i ~/.ssh/eduplatform_deploy shukhratbekovb@34.1.238.7 "echo OK"
```

#### Шаг 3: Добавь в GitHub Secrets

```bash
# Скопируй приватный ключ в буфер обмена
cat ~/.ssh/eduplatform_deploy
```

**В GitHub:**
- `PROD_HOST` → `34.1.238.7`
- `PROD_USER` → `shukhratbekovb`
- `PROD_SSH_KEY` → содержимое файла `~/.ssh/eduplatform_deploy` (весь текст включая `-----BEGIN` и `-----END`)

---

### 4. `STAGING_HOST` + `STAGING_USER` + `STAGING_SSH_KEY`

**(Опционально)** — нужны только если есть отдельный staging сервер.

Процесс аналогичен продакшну (шаги 1-3 выше), но для staging сервера.

Если staging сервера нет — pipeline на ветке `develop` просто пропустит stages 7-8. Всё остальное (lint, tests, build) будет работать.

---

### 5. `TEST_USER_PASSWORD`

Пароль для E2E тестов (Playwright логинится как director/student).

**В GitHub:**
- `TEST_USER_PASSWORD` → `password123`

---

## Итоговая таблица секретов

| Secret | Значение | Обязательный? |
|--------|----------|:------------:|
| `DOCKERHUB_TOKEN` | Docker Hub access token | Да |
| `SONAR_TOKEN` | SonarCloud/SonarQube token | Да |
| `SONAR_HOST_URL` | `https://sonarcloud.io` | Да |
| `PROD_HOST` | `34.1.238.7` | Да |
| `PROD_USER` | `shukhratbekovb` | Да |
| `PROD_SSH_KEY` | Приватный SSH ключ (ed25519) | Да |
| `STAGING_HOST` | IP staging сервера | Нет |
| `STAGING_USER` | SSH user staging | Нет |
| `STAGING_SSH_KEY` | SSH ключ staging | Нет |
| `TEST_USER_PASSWORD` | `password123` | Нет |

---

## Подготовка сервера

### Продакшн сервер уже настроен

Убедись что:

```bash
# Docker работает без sudo
docker ps

# Проект на месте
ls ~/opt/eduplatform/deploy/docker-compose.prod.yml

# GCS ключ на месте
ls ~/opt/eduplatform/deploy/gcp_keys.json

# Env файлы настроены
ls ~/opt/eduplatform/deploy/.env
ls ~/opt/eduplatform/deploy/.env.backend
```

### Добавь пользователя в группу docker (если ещё нет)

```bash
sudo usermod -aG docker shukhratbekovb
# Перелогинься после этого
```

Это нужно чтобы CI/CD мог запускать `docker compose` через SSH без `sudo`.

---

## Как работает pipeline

### Push в `main` (production)

```
Install → Lint + Unit Tests → Quality Gate → Integration Tests
  → Build 5 Docker Images → Trivy Scan → Deploy Production
```

### Push в `develop` (staging)

```
Install → Lint + Unit Tests → Quality Gate → Integration Tests
  → Build 5 Docker Images → Trivy Scan → Deploy Staging → E2E Tests
```

### Pull Request в `main`

```
Install → Lint + Unit Tests → Quality Gate → Integration Tests
```

Без build и deploy — только проверка качества кода.

### Теги образов

| Ветка | Docker tag |
|-------|-----------|
| `main` | `latest` + `<commit-sha>` |
| `develop` | `staging` + `<commit-sha>` |

---

## Troubleshooting

### Pipeline падает на Install

```
Проверь: poetry.lock и package-lock.json закоммичены в git
```

### Lint/Mypy ошибки

```bash
# Локально проверить
cd backend
poetry run ruff check src/ tests/
poetry run mypy src/ --ignore-missing-imports
```

### Unit Tests падают

```bash
cd backend
poetry run pytest tests/unit/ -v
```

### Integration Tests падают

Тесты используют Testcontainers — Docker должен быть доступен в CI runner. GitHub Actions ubuntu-latest имеет Docker по умолчанию.

```bash
# Локально
cd backend
poetry run pytest tests/integration/ -v
```

### Build Images падает

- Проверь `DOCKERHUB_TOKEN` — не истёк ли
- Проверь что репозитории существуют на Docker Hub

### Trivy блокирует

Trivy блокирует build при CRITICAL/HIGH уязвимостях. Временно можно изменить `exit-code: 0` в ci-cd.yml чтобы не блокировал.

### Deploy падает

```bash
# Проверь SSH доступ вручную
ssh -i ~/.ssh/eduplatform_deploy shukhratbekovb@34.1.238.7 "docker ps"
```

- SSH ключ должен быть формата ed25519 или RSA
- Весь приватный ключ включая BEGIN/END headers
- Пользователь должен быть в группе `docker`

### SonarQube Quality Gate не проходит

- Coverage ниже 80% — допиши тесты
- Посмотри отчёт на SonarCloud/SonarQube для деталей
- Coverage exclusions настроены в `sonar-project.properties`

---

## Полезные команды

```bash
# Посмотреть статус pipeline
# GitHub → Actions → CI/CD Pipeline

# Ручной ре-ран упавшего job
# GitHub → Actions → выбрать run → Re-run failed jobs

# Посмотреть логи конкретного step
# GitHub → Actions → выбрать run → выбрать job → раскрыть step

# Скачать артефакты (coverage, playwright report)
# GitHub → Actions → выбрать run → Artifacts (внизу страницы)
```
