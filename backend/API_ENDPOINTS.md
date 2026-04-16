# EduPlatform — API Endpoints

> Base URL: `https://api.eduplatform.uz`  
> Auth: Bearer JWT в заголовке `Authorization`  
> Content-Type: `application/json`  
> Все UUID — строки. Пагинация: `?page=1&limit=20` → `{ data, total, page, limit, totalPages }`

---

## ══════════════════════════════════
## AUTH (общий для всех систем)
## ══════════════════════════════════

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| POST | `/auth/login` | `{ email, password }` | Вход. Возвращает `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | `{ refreshToken }` | Обновление access token |
| GET  | `/auth/me` | — | Текущий пользователь |
| POST | `/auth/logout` | — | Инвалидация refresh token |
| POST | `/auth/student/login` | `{ email, password }` | Вход для Student Portal. Возвращает `{ student, accessToken }` |

---

## ══════════════════════════════════
## LMS (LOGBOOK)
## ══════════════════════════════════

### Users / Staff

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/users` | `?role=teacher\|mup\|...` | Список сотрудников |
| POST   | `/lms/users` | `{ name, email, password, role, avatarUrl? }` | Создать аккаунт сотрудника |
| GET    | `/lms/users/:id` | — | Профиль сотрудника |
| PATCH  | `/lms/users/:id` | `{ name?, email?, role?, avatarUrl?, isActive? }` | Редактировать сотрудника |

---

### Directions (Направления)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/directions` | — | Список направлений (только активные) |
| POST   | `/lms/directions` | `{ name, description? }` | Создать направление |
| GET    | `/lms/directions/:id` | — | Детали направления |
| PATCH  | `/lms/directions/:id` | `{ name?, description? }` | Редактировать |
| POST   | `/lms/directions/:id/archive` | — | Архивировать |

---

### Subjects (Предметы)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/subjects` | `?directionId=` | Список предметов; фильтр по направлению |
| POST   | `/lms/subjects` | `{ name, directionId, description? }` | Создать предмет |
| GET    | `/lms/subjects/:id` | — | Детали предмета |
| PATCH  | `/lms/subjects/:id` | `{ name?, directionId?, description? }` | Редактировать |
| POST   | `/lms/subjects/:id/archive` | — | Архивировать |

---

### Rooms (Аудитории)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/rooms` | — | Список аудиторий |
| POST   | `/lms/rooms` | `{ name, capacity? }` | Создать аудиторию |
| PATCH  | `/lms/rooms/:id` | `{ name?, capacity?, isActive? }` | Редактировать |
| DELETE | `/lms/rooms/:id` | — | Удалить |

---

### Groups (Группы)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/groups` | `?teacherId=&directionId=` | Список групп (активных) |
| POST   | `/lms/groups` | `{ name, directionId, subjectId, teacherId, startDate?, endDate?, schedule? }` | Создать группу |
| GET    | `/lms/groups/:id` | — | Детали группы |
| PATCH  | `/lms/groups/:id` | `{ name?, teacherId?, subjectId?, ... }` | Редактировать |
| POST   | `/lms/groups/:id/archive` | — | Архивировать |
| GET    | `/lms/groups/:id/students` | — | Студенты группы |
| GET    | `/lms/groups/:id/lessons` | — | Уроки группы |

---

### Enrollments (Зачисления)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| POST   | `/lms/enrollments` | `{ studentId, groupId }` | Зачислить студента в группу |
| DELETE | `/lms/enrollments/:id` | — | Отчислить студента |

---

### Lessons (Уроки)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/lessons` | `?weekStart=&weekEnd=&teacherId=&groupId=&roomId=` | Расписание |
| POST   | `/lms/lessons` | `{ groupId, subjectId?, teacherId?, roomId?, date, startTime, endTime }` | Один урок |
| POST   | `/lms/lessons/bulk` | `{ groupId, subjectId?, teacherId?, roomId?, startDate, endDate, weekdays: number[], startTime, endTime }` | Серия уроков по дням недели |
| GET    | `/lms/lessons/:id` | — | Краткие данные урока |
| GET    | `/lms/lessons/:id/full` | — | Полные данные: `{ lesson, attendance[], grades[], diamonds[], materials[] }` |
| PATCH  | `/lms/lessons/:id` | `{ date?, startTime?, endTime?, roomId?, teacherId? }` | Редактировать урок |
| POST   | `/lms/lessons/:id/conduct` | `{ topic?, attendance[], grades[], diamonds[] }` | Провести урок |
| POST   | `/lms/lessons/:id/cancel` | `{ reason }` | Отменить урок |
| GET    | `/lms/lessons/:id/materials` | — | Материалы урока |
| POST   | `/lms/lessons/:id/materials` | `{ title, type, language, url }` | Добавить материал |
| DELETE | `/lms/lessons/:id/materials/:materialId` | — | Удалить материал |

---

### Students (Студенты)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/students` | `?search=&riskLevel=&page=&limit=` | Список студентов (пагинация) |
| POST   | `/lms/students` | `{ fullName, phone?, email?, password?, dateOfBirth?, parentName?, parentPhone? }` | Создать студента (создаёт user если email+password) |
| GET    | `/lms/students/:id` | — | Профиль студента |
| PATCH  | `/lms/students/:id` | `{ fullName?, phone?, email?, dateOfBirth?, parentName?, parentPhone? }` | Редактировать |
| GET    | `/lms/students/:id/risk` | — | Факторы риска |
| GET    | `/lms/students/:id/coins` | — | История монет |

---

### Homework

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/homework` | `?lessonId=&groupId=` | Список домашних заданий |
| POST   | `/lms/homework` | `{ lessonId, title, description?, type, deadline? }` | Создать задание |
| GET    | `/lms/homework/submissions` | `?assignmentId=&studentId=&status=&page=&limit=` | Список сдач |
| GET    | `/lms/homework/submissions/:id` | — | Детали сдачи |
| POST   | `/lms/homework/submissions/:id/review` | `{ grade, teacherComment? }` | Проверить сдачу |

---

### Late Entry Requests (Заявки на опоздание)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/late-requests` | `?status=pending\|approved\|rejected&page=&limit=` | Список заявок |
| POST   | `/lms/late-requests` | `{ lessonId, reason }` | Создать заявку (от студента) |
| GET    | `/lms/late-requests/:id` | — | Детали заявки |
| POST   | `/lms/late-requests/:id/review` | `{ status: 'approved'\|'rejected', reviewNote? }` | Рассмотреть заявку |

---

### MUP Tasks (Задачи МУП)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/tasks` | `?status=&assignedTo=` | Список задач |
| POST   | `/lms/tasks` | `{ title, assignedTo, description?, dueDate? }` | Создать задачу |
| GET    | `/lms/tasks/:id` | — | Детали |
| PATCH  | `/lms/tasks/:id` | `{ title?, description?, dueDate?, assignedTo? }` | Редактировать |
| POST   | `/lms/tasks/:id/move` | `{ status }` | Сменить статус (pending→in_progress→done) |
| DELETE | `/lms/tasks/:id` | — | Удалить |

---

### Exams (Экзамены)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/exams` | `?groupId=&status=` | Список экзаменов |
| POST   | `/lms/exams` | `{ groupId, subjectId?, title, date, roomId?, maxScore? }` | Создать экзамен |
| GET    | `/lms/exams/:id` | — | Детали |
| PATCH  | `/lms/exams/:id` | `{ title?, date?, roomId?, status? }` | Редактировать |
| DELETE | `/lms/exams/:id` | — | Удалить |

---

### Compensation & Salaries

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/compensation` | — | Модели оплаты всех учителей |
| GET    | `/lms/compensation/:teacherId` | — | Модель оплаты учителя |
| PUT    | `/lms/compensation/:teacherId` | `{ type: 'per_lesson'\|'fixed'\|'hybrid', ratePerLesson?, fixedMonthlyRate?, ratePerStudent? }` | Сохранить модель |
| GET    | `/lms/salaries` | `?teacherId=&month=` | История расчётов зарплат |

---

### Finance / Payments

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/lms/finance/payments` | `?status=paid\|pending\|overdue&studentId=&month=` | Список платежей |
| POST   | `/lms/finance/payments` | `{ studentId, amount, month, description?, enrollmentId? }` | Принять оплату |
| PATCH  | `/lms/finance/payments/:id` | `{ status?, amount?, notes? }` | Редактировать платёж |

---

### Analytics (LMS)

| Method | Path | Параметры | Описание |
|--------|------|-----------|----------|
| GET | `/lms/analytics/overview` | `?period=` | Общая статистика: студенты, уроки, посещаемость, средняя оценка |
| GET | `/lms/analytics/attendance` | `?groupId=&from=&to=` | Статистика посещаемости |
| GET | `/lms/analytics/grades` | `?groupId=&subjectId=&from=&to=` | Статистика оценок |
| GET | `/lms/analytics/risk` | — | Распределение по уровням риска `{ normal, at_risk, critical }` |
| GET | `/lms/analytics/homework` | `?teacherId=` | Статистика ДЗ: submitRate, reviewedRate, overdueRate |
| GET | `/lms/analytics/homework-by-teacher` | — | ДЗ в разрезе учителей |
| GET | `/lms/analytics/teachers` | `?from=&to=` | Активность учителей |

---

### Reports (LMS)

| Method | Path | Параметры | Описание |
|--------|------|-----------|----------|
| GET | `/lms/reports/income` | `?from=&to=` | Доход по месяцам + по направлениям |
| GET | `/lms/reports/performance` | `?directionId=&from=&to=` | Успеваемость по группам |
| GET | `/lms/reports/teacher-hours` | `?from=&to=&teacherId=` | Часы учителей |
| GET | `/lms/reports/by-direction` | `?from=&to=` | Уроки/студенты/группы по направлениям |

---

### Notifications (LMS)

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/notifications` | — | Уведомления текущего пользователя |
| POST   | `/notifications/:id/read` | — | Отметить прочитанным |
| POST   | `/notifications/read-all` | — | Прочитать всё |

---

## ══════════════════════════════════
## CRM
## ══════════════════════════════════

### Users (CRM)

| Method | Path | Описание |
|--------|------|----------|
| GET    | `/crm/users` | Менеджеры и директора (для назначений) |

---

### Funnels (Воронки)

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/crm/funnels` | — | Список воронок |
| POST   | `/crm/funnels` | `{ name }` | Создать воронку |
| GET    | `/crm/funnels/:id` | — | Детали воронки |
| PATCH  | `/crm/funnels/:id` | `{ name? }` | Переименовать |
| DELETE | `/crm/funnels/:id` | — | Удалить |
| POST   | `/crm/funnels/:id/archive` | — | Архивировать |

---

### Stages (Стадии)

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/crm/funnels/:funnelId/stages` | — | Стадии воронки |
| POST   | `/crm/funnels/:funnelId/stages` | `{ name, color?, winProbability? }` | Добавить стадию |
| PATCH  | `/crm/stages/:id` | `{ name?, color?, winProbability?, order? }` | Редактировать |
| DELETE | `/crm/stages/:id` | — | Удалить стадию |
| POST   | `/crm/funnels/:funnelId/stages/reorder` | `{ ids: string[] }` | Переставить порядок |
| POST   | `/crm/stages/:id/migrate-leads` | `{ targetStageId }` | Перенести лиды перед удалением |

---

### Custom Fields (Кастомные поля)

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/crm/funnels/:funnelId/custom-fields` | — | Список полей воронки |
| POST   | `/crm/funnels/:funnelId/custom-fields` | `{ label, type, options? }` | Добавить поле |
| PATCH  | `/crm/custom-fields/:id` | `{ label?, type?, options?, order? }` | Редактировать |
| DELETE | `/crm/custom-fields/:id` | — | Удалить |
| POST   | `/crm/funnels/:funnelId/custom-fields/reorder` | `{ ids: string[] }` | Переставить порядок |

---

### Lead Sources (Источники лидов)

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/crm/lead-sources` | — | Список источников |
| POST   | `/crm/lead-sources` | `{ name, type: 'manual'\|'import'\|'api', webhookUrl? }` | Создать источник |
| PATCH  | `/crm/lead-sources/:id` | `{ name?, isActive?, webhookUrl? }` | Редактировать |
| DELETE | `/crm/lead-sources/:id` | — | Удалить |
| POST   | `/crm/lead-sources/:id/regenerate-secret` | — | Новый webhook secret |

---

### Leads (Лиды)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/crm/leads` | `?funnelId=&stageId=&status=&assignedTo=&sourceId=&search=&page=&limit=` | Список лидов |
| POST   | `/crm/leads` | `{ fullName, phone, email?, sourceId, funnelId, stageId, assignedTo, customFields? }` | Создать лида |
| GET    | `/crm/leads/:id` | — | Детали лида |
| PATCH  | `/crm/leads/:id` | `{ fullName?, phone?, email?, assignedTo?, customFields? }` | Редактировать |
| DELETE | `/crm/leads/:id` | — | Удалить |
| POST   | `/crm/leads/:id/move-stage` | `{ stageId }` | Перевести на стадию |
| POST   | `/crm/leads/:id/mark-won` | — | Закрыть как выигранного |
| POST   | `/crm/leads/:id/mark-lost` | `{ reason }` | Закрыть как проигранного |

---

### Lead Timeline

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/crm/leads/:id/timeline` | `?page=&limit=` | Timeline: активности + смены стадий + назначений + комментарии |
| POST   | `/crm/leads/:id/activities` | `{ type, date, outcome, notes?, durationMinutes?, channel?, needsFollowUp? }` | Добавить активность (звонок/встреча/…) |
| POST   | `/crm/leads/:id/comments` | `{ text }` | Добавить комментарий |
| DELETE | `/crm/leads/:id/comments/:commentId` | — | Удалить комментарий |

---

### CRM Tasks

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/crm/tasks` | `?assignedTo=&status=&linkedLeadId=&priority=` | Список задач |
| POST   | `/crm/tasks` | `{ title, description?, linkedLeadId?, assignedTo, dueDate, priority?, reminderAt? }` | Создать задачу |
| PATCH  | `/crm/tasks/:id` | `{ title?, description?, dueDate?, priority?, status?, reminderAt? }` | Редактировать |
| DELETE | `/crm/tasks/:id` | — | Удалить |
| POST   | `/crm/tasks/:id/move` | `{ status }` | Сменить статус |

---

### Notifications (CRM)

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/notifications` | — | Уведомления пользователя CRM |
| POST   | `/notifications/:id/read` | — | Прочитать |
| POST   | `/notifications/read-all` | — | Прочитать все |

---

### Analytics (CRM)

| Method | Path | Параметры | Описание |
|--------|------|-----------|----------|
| GET | `/crm/analytics/overview` | `?from=&to=` | Итоги: лиды всего, выиграно, проиграно, конверсия, выручка |
| GET | `/crm/analytics/sources` | `?from=&to=` | Лиды по источникам |
| GET | `/crm/analytics/managers` | `?from=&to=` | KPI менеджеров |
| GET | `/crm/analytics/funnel-conversion` | `?funnelId=` | Конверсия по стадиям воронки |
| GET | `/crm/analytics/loss-reasons` | `?from=&to=` | Причины отказов |
| GET | `/crm/analytics/time-to-close` | `?from=&to=` | Среднее время закрытия |
| GET | `/crm/analytics/touches-to-close` | `?from=&to=` | Число касаний до закрытия |
| GET | `/crm/analytics/forecast` | `?from=&to=` | Прогноз выручки |
| GET | `/crm/analytics/leads-over-time` | `?from=&to=&granularity=day\|week\|month` | Динамика лидов |
| GET | `/crm/analytics/sankey` | `?funnelId=` | Sankey: источник → стадия → исход |

---

## ══════════════════════════════════
## STUDENT PORTAL
## ══════════════════════════════════

### Dashboard & Profile

| Method | Path | Тело | Описание |
|--------|------|------|----------|
| GET    | `/student/dashboard` | — | Агрегированный дашборд: оценки, посещаемость, задания, лента активности, лидерборд |
| GET    | `/student/profile` | — | Профиль студента (student объект) |
| PATCH  | `/student/profile` | `{ phone?, email?, dateOfBirth? }` | Обновить профиль |

---

### Schedule (Расписание)

| Method | Path | Параметры | Описание |
|--------|------|-----------|----------|
| GET    | `/student/schedule` | `?weekStart=YYYY-MM-DD` | Уроки недели (текущая/следующая) |

---

### Subjects

| Method | Path | Описание |
|--------|------|----------|
| GET    | `/student/subjects` | Предметы студента с текущей средней оценкой |

---

### Grades & Attendance (через performance)

| Method | Path | Параметры | Описание |
|--------|------|-----------|----------|
| GET    | `/student/performance` | — | Успеваемость по всем предметам |
| GET    | `/student/performance/:subjectId` | — | Детальная успеваемость по предмету: оценки, посещаемость, незакрытые задания |

---

### Assignments (Задания)

| Method | Path | Тело / Параметры | Описание |
|--------|------|------------------|----------|
| GET    | `/student/assignments` | `?status=pending\|submitted\|reviewed` | Список заданий |
| GET    | `/student/assignments/:id` | — | Детали задания |
| POST   | `/student/assignments/:id/submit` | `{ fileUrl }` | Сдать задание |

---

### Materials (Материалы)

| Method | Path | Параметры | Описание |
|--------|------|-----------|----------|
| GET    | `/student/materials` | `?subjectId=&language=ru\|en\|uz&type=` | Материалы с фильтрами |

---

### Achievements (Достижения)

| Method | Path | Описание |
|--------|------|----------|
| GET    | `/student/achievements` | Все достижения с флагом `isUnlocked` |

---

### Leaderboard

| Method | Path | Параметры | Описание |
|--------|------|-----------|----------|
| GET    | `/student/leaderboard` | `?scope=group\|all&period=month\|all` | Лидерборд группы или всей платформы |

---

### Payments (Student view)

| Method | Path | Описание |
|--------|------|----------|
| GET    | `/student/payments` | История платежей студента |

---

### Contacts

| Method | Path | Описание |
|--------|------|----------|
| GET    | `/student/contacts` | Контакты (куратор, менеджер, тех.поддержка, учителя) |

---

## ══════════════════════════════════
## СВОДНАЯ СТАТИСТИКА ЭНДПОИНТОВ
## ══════════════════════════════════

| Система        | Эндпоинтов |
|----------------|-----------|
| Auth           | 5         |
| LMS (Logbook)  | ~65       |
| CRM            | ~45       |
| Student Portal | ~18       |
| **Итого**      | **~133**  |

---

## Коды ответов

| Код | Значение |
|-----|----------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (DELETE) |
| 400 | Bad Request (валидация) |
| 401 | Unauthorized (нет/истёк токен) |
| 403 | Forbidden (нет прав) |
| 404 | Not Found |
| 409 | Conflict (дубль email, и т.д.) |
| 422 | Unprocessable Entity (бизнес-ошибка) |
| 500 | Internal Server Error |

---

## Структуры ключевых ответов

### Пагинация
```json
{
  "data": [...],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### POST /auth/login (LMS/CRM)
```json
{
  "user": { "id", "name", "email", "role", "avatarUrl" },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### POST /auth/student/login
```json
{
  "student": { "id", "fullName", "studentCode", "stars", "crystals", ... },
  "accessToken": "..."
}
```

### GET /lms/lessons/:id/full
```json
{
  "lesson":     { ...lesson },
  "attendance": [{ "studentId", "status", "note" }],
  "grades":     [{ "studentId", "type", "value", "comment" }],
  "diamonds":   [{ "studentId", "amount" }],
  "materials":  [{ "id", "title", "type", "language", "url" }]
}
```

### GET /student/dashboard
```json
{
  "pendingAssignments": 3,
  "onTimeAssignments": 8,
  "totalAssignments": 12,
  "avgGrades": { "class": 10.5, "independent": 8.6, "control": 10.4, "thematic": 11.2 },
  "attendance30d": { "presentPercent": 90, "absentPercent": 7, "latePercent": 3 },
  "recentGrades": [...],
  "activityFeed": [...],
  "leaderboard": [...],
  "attendanceCalendar": [...],
  "gradesByMonth": [...]
}
```

### GET /crm/leads/:id/timeline
```json
{
  "data": [
    { "type": "activity",          "date": "...", "data": { Activity } },
    { "type": "stage_change",      "date": "...", "data": { StageChange } },
    { "type": "assignment_change", "date": "...", "data": { AssignmentChange } },
    { "type": "comment",           "date": "...", "data": { LeadComment } }
  ],
  "total": 12,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```
