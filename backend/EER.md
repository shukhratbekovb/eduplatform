# EduPlatform — EER (Entity-Relationship) Tables

> База данных: **PostgreSQL**  
> Все `id` — UUID (gen_random_uuid())  
> Все `created_at`, `updated_at` — TIMESTAMPTZ DEFAULT now()  
> Системы: **Logbook** (LMS) · **CRM** · **Student Portal** → единый централизованный backend

---

## ENUMs

```sql
CREATE TYPE user_role        AS ENUM ('director','mup','teacher','sales_manager','cashier','student');
CREATE TYPE risk_level       AS ENUM ('normal','medium','high');
CREATE TYPE badge_level      AS ENUM ('none','bronze','silver','gold','platinum');
CREATE TYPE lesson_status    AS ENUM ('scheduled','completed','cancelled');
CREATE TYPE attendance_status AS ENUM ('present','absent','late','excused');
CREATE TYPE grade_type       AS ENUM ('class','independent','control','thematic','homework');
CREATE TYPE hw_status        AS ENUM ('pending','submitted','reviewed','overdue');
CREATE TYPE payment_status   AS ENUM ('paid','pending','overdue');
CREATE TYPE lead_status      AS ENUM ('active','won','lost');
CREATE TYPE lead_source_type AS ENUM ('manual','import','api');
CREATE TYPE cf_type          AS ENUM ('text','number','date','select','multiselect','checkbox');
CREATE TYPE activity_type    AS ENUM ('call','meeting','message','other');
CREATE TYPE task_priority    AS ENUM ('low','medium','high','critical');
CREATE TYPE task_status_crm  AS ENUM ('pending','in_progress','done','overdue');
CREATE TYPE notif_type_crm   AS ENUM ('task_due_soon','task_overdue','task_assigned');
CREATE TYPE ach_category     AS ENUM ('academic','attendance','activity','social','special');
CREATE TYPE activity_event_type AS ENUM ('stars_earned','crystals_earned','homework_graded','attendance','teacher_reply','badge_unlocked');
CREATE TYPE material_type    AS ENUM ('pdf','video','article','presentation');
CREATE TYPE material_lang    AS ENUM ('ru','en','uz');
CREATE TYPE contact_role     AS ENUM ('curator','manager','support','teacher','dean','admin');
```

---

## ══════════════════════════════════
## CORE / SHARED
## ══════════════════════════════════

## 1. users

| Column        | Type           | Constraints                          |
|---------------|----------------|--------------------------------------|
| id            | UUID           | PK, DEFAULT gen_random_uuid()        |
| email         | VARCHAR(255)   | UNIQUE, NOT NULL                     |
| password_hash | VARCHAR(255)   | NOT NULL                             |
| name          | VARCHAR(255)   | NOT NULL                             |
| role          | user_role      | NOT NULL                             |
| avatar_url    | TEXT           | NULL                                 |
| is_active     | BOOLEAN        | NOT NULL DEFAULT true                |
| created_at    | TIMESTAMPTZ    | NOT NULL DEFAULT now()               |
| updated_at    | TIMESTAMPTZ    | NOT NULL DEFAULT now()               |

**Indexes:** `idx_users_email`, `idx_users_role`

---

## ══════════════════════════════════
## LMS (LOGBOOK)
## ══════════════════════════════════

## 2. students

| Column              | Type             | Constraints                                              |
|---------------------|------------------|----------------------------------------------------------|
| id                  | UUID             | PK, DEFAULT gen_random_uuid()                            |
| user_id             | UUID             | FK → users(id) ON DELETE SET NULL, NULL                  |
| student_code        | VARCHAR(30)      | UNIQUE, NULL (e.g. SEP-24211, generated on enroll)       |
| full_name           | VARCHAR(255)     | NOT NULL                                                 |
| phone               | VARCHAR(30)      | NULL                                                     |
| email               | VARCHAR(255)     | NULL                                                     |
| date_of_birth       | DATE             | NULL                                                     |
| photo_url           | TEXT             | NULL                                                     |
| parent_name         | VARCHAR(255)     | NULL                                                     |
| parent_phone        | VARCHAR(30)      | NULL                                                     |
| is_active           | BOOLEAN          | NOT NULL DEFAULT true                                    |
| risk_level          | risk_level       | NOT NULL DEFAULT 'normal'                                |
| risk_last_updated   | TIMESTAMPTZ      | NULL                                                     |
| total_coins         | INTEGER          | NOT NULL DEFAULT 0 (diamonds from teacher awards)        |
| stars               | INTEGER          | NOT NULL DEFAULT 0 (gamification, student portal)        |
| crystals            | INTEGER          | NOT NULL DEFAULT 0 (gamification, student portal)        |
| badge_level         | badge_level      | NOT NULL DEFAULT 'none'                                  |
| gpa                 | NUMERIC(4,2)     | NULL (computed/cached, 1-12 scale)                       |
| attendance_percent  | NUMERIC(5,2)     | NULL (computed/cached)                                   |
| created_at          | TIMESTAMPTZ      | NOT NULL DEFAULT now()                                   |
| updated_at          | TIMESTAMPTZ      | NOT NULL DEFAULT now()                                   |

**Indexes:** `idx_students_user_id`, `idx_students_student_code`, `idx_students_risk_level`

---

## 3. directions

| Column      | Type         | Constraints                   |
|-------------|--------------|-------------------------------|
| id          | UUID         | PK                            |
| name        | VARCHAR(255) | NOT NULL                      |
| description | TEXT         | NULL                          |
| is_active   | BOOLEAN      | NOT NULL DEFAULT true         |
| created_at  | TIMESTAMPTZ  | NOT NULL DEFAULT now()        |
| updated_at  | TIMESTAMPTZ  | NOT NULL DEFAULT now()        |

---

## 4. subjects

| Column       | Type         | Constraints                        |
|--------------|--------------|------------------------------------|
| id           | UUID         | PK                                 |
| direction_id | UUID         | FK → directions(id) ON DELETE SET NULL, NULL |
| name         | VARCHAR(255) | NOT NULL                           |
| description  | TEXT         | NULL                               |
| is_active    | BOOLEAN      | NOT NULL DEFAULT true              |
| created_at   | TIMESTAMPTZ  | NOT NULL DEFAULT now()             |
| updated_at   | TIMESTAMPTZ  | NOT NULL DEFAULT now()             |

**Indexes:** `idx_subjects_direction_id`

---

## 5. rooms

| Column    | Type         | Constraints             |
|-----------|--------------|-------------------------|
| id        | UUID         | PK                      |
| name      | VARCHAR(100) | NOT NULL                |
| capacity  | INTEGER      | NULL                    |
| is_active | BOOLEAN      | NOT NULL DEFAULT true   |
| created_at| TIMESTAMPTZ  | NOT NULL DEFAULT now()  |
| updated_at| TIMESTAMPTZ  | NOT NULL DEFAULT now()  |

---

## 6. groups

| Column       | Type         | Constraints                             |
|--------------|--------------|-----------------------------------------|
| id           | UUID         | PK                                      |
| name         | VARCHAR(100) | NOT NULL                                |
| direction_id | UUID         | FK → directions(id) ON DELETE SET NULL, NULL |
| subject_id   | UUID         | FK → subjects(id) ON DELETE SET NULL, NULL |
| teacher_id   | UUID         | FK → users(id) ON DELETE SET NULL, NULL |
| start_date   | DATE         | NULL                                    |
| end_date     | DATE         | NULL                                    |
| schedule     | JSONB        | NULL (e.g. {"days":[1,3,5],"time":"19:00"}) |
| is_active    | BOOLEAN      | NOT NULL DEFAULT true                   |
| created_at   | TIMESTAMPTZ  | NOT NULL DEFAULT now()                  |
| updated_at   | TIMESTAMPTZ  | NOT NULL DEFAULT now()                  |

**Indexes:** `idx_groups_direction_id`, `idx_groups_teacher_id`, `idx_groups_subject_id`

---

## 7. enrollments

| Column     | Type        | Constraints                             |
|------------|-------------|-----------------------------------------|
| id         | UUID        | PK                                      |
| student_id | UUID        | FK → students(id) ON DELETE CASCADE     |
| group_id   | UUID        | FK → groups(id) ON DELETE CASCADE       |
| enrolled_at| TIMESTAMPTZ | NOT NULL DEFAULT now()                  |
| left_at    | TIMESTAMPTZ | NULL                                    |
| is_active  | BOOLEAN     | NOT NULL DEFAULT true                   |

**Unique:** `(student_id, group_id)`  
**Indexes:** `idx_enrollments_student_id`, `idx_enrollments_group_id`

---

## 8. lessons

| Column      | Type            | Constraints                             |
|-------------|-----------------|-----------------------------------------|
| id          | UUID            | PK                                      |
| group_id    | UUID            | FK → groups(id) ON DELETE CASCADE       |
| subject_id  | UUID            | FK → subjects(id) ON DELETE SET NULL, NULL |
| teacher_id  | UUID            | FK → users(id) ON DELETE SET NULL, NULL |
| room_id     | UUID            | FK → rooms(id) ON DELETE SET NULL, NULL |
| date        | DATE            | NOT NULL                                |
| start_time  | TIME            | NOT NULL                                |
| end_time    | TIME            | NOT NULL                                |
| status      | lesson_status   | NOT NULL DEFAULT 'scheduled'            |
| is_online   | BOOLEAN         | NOT NULL DEFAULT false                  |
| topic       | TEXT            | NULL                                    |
| conducted_at| TIMESTAMPTZ     | NULL (when teacher marks conducted)     |
| created_at  | TIMESTAMPTZ     | NOT NULL DEFAULT now()                  |
| updated_at  | TIMESTAMPTZ     | NOT NULL DEFAULT now()                  |

**Indexes:** `idx_lessons_group_id`, `idx_lessons_teacher_id`, `idx_lessons_date`, `idx_lessons_status`

---

## 9. attendance_records

| Column     | Type              | Constraints                              |
|------------|-------------------|------------------------------------------|
| id         | UUID              | PK                                       |
| lesson_id  | UUID              | FK → lessons(id) ON DELETE CASCADE       |
| student_id | UUID              | FK → students(id) ON DELETE CASCADE      |
| status     | attendance_status | NOT NULL DEFAULT 'present'               |
| note       | TEXT              | NULL                                     |
| created_at | TIMESTAMPTZ       | NOT NULL DEFAULT now()                   |
| updated_at | TIMESTAMPTZ       | NOT NULL DEFAULT now()                   |

**Unique:** `(lesson_id, student_id)`  
**Indexes:** `idx_attendance_lesson_id`, `idx_attendance_student_id`

---

## 10. grade_records

Используется и в Logbook (оценки от 1-12), и в Student Portal (тот же масштаб).

| Column     | Type        | Constraints                              |
|------------|-------------|------------------------------------------|
| id         | UUID        | PK                                       |
| lesson_id  | UUID        | FK → lessons(id) ON DELETE CASCADE       |
| student_id | UUID        | FK → students(id) ON DELETE CASCADE      |
| type       | grade_type  | NOT NULL                                 |
| value      | NUMERIC(4,1)| NOT NULL CHECK (value BETWEEN 1 AND 12)  |
| comment    | TEXT        | NULL                                     |
| graded_by  | UUID        | FK → users(id) ON DELETE SET NULL, NULL  |
| graded_at  | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_grades_lesson_id`, `idx_grades_student_id`, `idx_grades_type`

---

## 11. diamond_records

Алмазы выдаются учителем на уроке (gamification в Logbook).

| Column     | Type        | Constraints                              |
|------------|-------------|------------------------------------------|
| id         | UUID        | PK                                       |
| lesson_id  | UUID        | FK → lessons(id) ON DELETE CASCADE       |
| student_id | UUID        | FK → students(id) ON DELETE CASCADE      |
| amount     | INTEGER     | NOT NULL CHECK (amount >= 0)             |
| awarded_by | UUID        | FK → users(id) ON DELETE SET NULL, NULL  |
| note       | TEXT        | NULL                                     |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_diamonds_lesson_id`, `idx_diamonds_student_id`

---

## 12. lesson_materials

| Column      | Type          | Constraints                              |
|-------------|---------------|------------------------------------------|
| id          | UUID          | PK                                       |
| lesson_id   | UUID          | FK → lessons(id) ON DELETE CASCADE       |
| title       | VARCHAR(255)  | NOT NULL                                 |
| type        | material_type | NOT NULL DEFAULT 'pdf'                   |
| language    | material_lang | NOT NULL DEFAULT 'ru'                    |
| url         | TEXT          | NOT NULL                                 |
| uploaded_by | UUID          | FK → users(id) ON DELETE SET NULL, NULL  |
| uploaded_at | TIMESTAMPTZ   | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_materials_lesson_id`

---

## 13. homework_assignments

| Column        | Type          | Constraints                              |
|---------------|---------------|------------------------------------------|
| id            | UUID          | PK                                       |
| lesson_id     | UUID          | FK → lessons(id) ON DELETE CASCADE       |
| title         | VARCHAR(255)  | NOT NULL                                 |
| description   | TEXT          | NULL                                     |
| type          | grade_type    | NOT NULL DEFAULT 'homework'              |
| deadline      | TIMESTAMPTZ   | NULL                                     |
| materials_count| INTEGER      | NOT NULL DEFAULT 0                       |
| created_by    | UUID          | FK → users(id) ON DELETE SET NULL, NULL  |
| created_at    | TIMESTAMPTZ   | NOT NULL DEFAULT now()                   |
| updated_at    | TIMESTAMPTZ   | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_hw_assignments_lesson_id`

---

## 14. homework_submissions

| Column          | Type        | Constraints                                          |
|-----------------|-------------|------------------------------------------------------|
| id              | UUID        | PK                                                   |
| assignment_id   | UUID        | FK → homework_assignments(id) ON DELETE CASCADE      |
| student_id      | UUID        | FK → students(id) ON DELETE CASCADE                  |
| status          | hw_status   | NOT NULL DEFAULT 'pending'                           |
| submitted_file_url | TEXT     | NULL                                                 |
| grade           | NUMERIC(4,1)| NULL CHECK (grade BETWEEN 1 AND 12)                  |
| teacher_comment | TEXT        | NULL                                                 |
| reviewed_by     | UUID        | FK → users(id) ON DELETE SET NULL, NULL              |
| submitted_at    | TIMESTAMPTZ | NULL                                                 |
| reviewed_at     | TIMESTAMPTZ | NULL                                                 |
| created_at      | TIMESTAMPTZ | NOT NULL DEFAULT now()                               |
| updated_at      | TIMESTAMPTZ | NOT NULL DEFAULT now()                               |

**Unique:** `(assignment_id, student_id)`  
**Indexes:** `idx_hw_submissions_assignment_id`, `idx_hw_submissions_student_id`, `idx_hw_submissions_status`

---

## 15. late_entry_requests

Заявки на опоздание (студент просит учителя/МУП изменить статус посещаемости).

| Column      | Type        | Constraints                              |
|-------------|-------------|------------------------------------------|
| id          | UUID        | PK                                       |
| lesson_id   | UUID        | FK → lessons(id) ON DELETE CASCADE       |
| student_id  | UUID        | FK → students(id) ON DELETE CASCADE      |
| reason      | TEXT        | NOT NULL                                 |
| status      | VARCHAR(20) | NOT NULL DEFAULT 'pending'               |
| resolved_by | UUID        | FK → users(id) ON DELETE SET NULL, NULL  |
| resolved_at | TIMESTAMPTZ | NULL                                     |
| created_at  | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_late_requests_lesson_id`, `idx_late_requests_student_id`

---

## 16. coin_transactions

Транзакции монет (Logbook, монеты выдаются/снимаются МУП или системой).

| Column      | Type        | Constraints                              |
|-------------|-------------|------------------------------------------|
| id          | UUID        | PK                                       |
| student_id  | UUID        | FK → students(id) ON DELETE CASCADE      |
| amount      | INTEGER     | NOT NULL (positive = add, negative = deduct) |
| reason      | TEXT        | NULL                                     |
| issued_by   | UUID        | FK → users(id) ON DELETE SET NULL, NULL  |
| created_at  | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_coin_tx_student_id`

---

## 17. mup_tasks

Задачи МУП (менеджер учебного процесса).

| Column       | Type        | Constraints                              |
|--------------|-------------|------------------------------------------|
| id           | UUID        | PK                                       |
| assigned_to  | UUID        | FK → users(id) ON DELETE CASCADE         |
| created_by   | UUID        | FK → users(id) ON DELETE SET NULL, NULL  |
| title        | VARCHAR(255)| NOT NULL                                 |
| description  | TEXT        | NULL                                     |
| due_date     | DATE        | NULL                                     |
| is_done      | BOOLEAN     | NOT NULL DEFAULT false                   |
| created_at   | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |
| updated_at   | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_mup_tasks_assigned_to`

---

## 18. lms_notifications

Уведомления для пользователей Logbook (учителя, МУП, директор).

| Column       | Type        | Constraints                              |
|--------------|-------------|------------------------------------------|
| id           | UUID        | PK                                       |
| user_id      | UUID        | FK → users(id) ON DELETE CASCADE         |
| title        | VARCHAR(255)| NOT NULL                                 |
| body         | TEXT        | NULL                                     |
| is_read      | BOOLEAN     | NOT NULL DEFAULT false                   |
| linked_entity| JSONB       | NULL (e.g. {"type":"lesson","id":"..."}) |
| created_at   | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_lms_notifications_user_id`, `idx_lms_notifications_is_read`

---

## 19. compensation_models

Модели расчёта зарплаты учителей.

| Column         | Type        | Constraints                     |
|----------------|-------------|---------------------------------|
| id             | UUID        | PK                              |
| name           | VARCHAR(255)| NOT NULL                        |
| description    | TEXT        | NULL                            |
| params         | JSONB       | NOT NULL DEFAULT '{}'           |
| is_active      | BOOLEAN     | NOT NULL DEFAULT true           |
| created_at     | TIMESTAMPTZ | NOT NULL DEFAULT now()          |
| updated_at     | TIMESTAMPTZ | NOT NULL DEFAULT now()          |

---

## 20. salary_calculations

| Column           | Type         | Constraints                                     |
|------------------|--------------|-------------------------------------------------|
| id               | UUID         | PK                                              |
| teacher_id       | UUID         | FK → users(id) ON DELETE CASCADE                |
| model_id         | UUID         | FK → compensation_models(id) ON DELETE SET NULL, NULL |
| period_start     | DATE         | NOT NULL                                        |
| period_end       | DATE         | NOT NULL                                        |
| lessons_count    | INTEGER      | NOT NULL DEFAULT 0                              |
| students_count   | INTEGER      | NOT NULL DEFAULT 0                              |
| base_amount      | NUMERIC(12,2)| NOT NULL DEFAULT 0                              |
| bonus_amount     | NUMERIC(12,2)| NOT NULL DEFAULT 0                              |
| total_amount     | NUMERIC(12,2)| NOT NULL DEFAULT 0                              |
| calculated_at    | TIMESTAMPTZ  | NOT NULL DEFAULT now()                          |
| approved_by      | UUID         | FK → users(id) ON DELETE SET NULL, NULL         |
| approved_at      | TIMESTAMPTZ  | NULL                                            |

**Indexes:** `idx_salary_teacher_id`, `idx_salary_period`

---

## 21. payments

Оплаты за обучение (Logbook + Student Portal).

| Column       | Type           | Constraints                              |
|--------------|----------------|------------------------------------------|
| id           | UUID           | PK                                       |
| student_id   | UUID           | FK → students(id) ON DELETE CASCADE      |
| enrollment_id| UUID           | FK → enrollments(id) ON DELETE SET NULL, NULL |
| period       | VARCHAR(50)    | NOT NULL (e.g. 'Апрель 2026')            |
| description  | TEXT           | NULL                                     |
| amount       | NUMERIC(12,2)  | NOT NULL                                 |
| currency     | VARCHAR(10)    | NOT NULL DEFAULT 'UZS'                   |
| status       | payment_status | NOT NULL DEFAULT 'pending'               |
| due_date     | DATE           | NULL                                     |
| paid_at      | TIMESTAMPTZ    | NULL                                     |
| received_by  | UUID           | FK → users(id) ON DELETE SET NULL, NULL  |
| notes        | TEXT           | NULL                                     |
| created_at   | TIMESTAMPTZ    | NOT NULL DEFAULT now()                   |
| updated_at   | TIMESTAMPTZ    | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_payments_student_id`, `idx_payments_status`, `idx_payments_due_date`

---

## 22. exams

| Column       | Type        | Constraints                              |
|--------------|-------------|------------------------------------------|
| id           | UUID        | PK                                       |
| group_id     | UUID        | FK → groups(id) ON DELETE CASCADE        |
| subject_id   | UUID        | FK → subjects(id) ON DELETE SET NULL, NULL|
| title        | VARCHAR(255)| NOT NULL                                 |
| date         | DATE        | NOT NULL                                 |
| max_score    | NUMERIC(4,1)| NOT NULL DEFAULT 12                      |
| created_by   | UUID        | FK → users(id) ON DELETE SET NULL, NULL  |
| created_at   | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_exams_group_id`

---

## 23. risk_factors

Факторы риска (рассчитываются ночным Celery-воркером).

| Column      | Type        | Constraints                              |
|-------------|-------------|------------------------------------------|
| id          | UUID        | PK                                       |
| student_id  | UUID        | FK → students(id) ON DELETE CASCADE      |
| factor_type | VARCHAR(50) | NOT NULL (e.g. 'attendance','grade','payment') |
| value       | NUMERIC(5,2)| NOT NULL                                 |
| details     | JSONB       | NULL                                     |
| computed_at | TIMESTAMPTZ | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_risk_factors_student_id`

---

## ══════════════════════════════════
## GAMIFICATION (Student Portal)
## ══════════════════════════════════

## 24. achievements

Библиотека достижений (настраивается администратором).

| Column          | Type         | Constraints                   |
|-----------------|--------------|-------------------------------|
| id              | UUID         | PK                            |
| name            | VARCHAR(255) | NOT NULL                      |
| description     | TEXT         | NULL                          |
| category        | ach_category | NOT NULL                      |
| icon            | VARCHAR(10)  | NULL (emoji)                  |
| reward_stars    | INTEGER      | NOT NULL DEFAULT 0            |
| reward_crystals | INTEGER      | NOT NULL DEFAULT 0            |
| trigger_type    | VARCHAR(50)  | NULL (e.g. 'attendance_streak','grade_12') |
| trigger_value   | INTEGER      | NULL (threshold)              |
| is_active       | BOOLEAN      | NOT NULL DEFAULT true         |
| created_at      | TIMESTAMPTZ  | NOT NULL DEFAULT now()        |
| updated_at      | TIMESTAMPTZ  | NOT NULL DEFAULT now()        |

---

## 25. student_achievements

| Column       | Type        | Constraints                                   |
|--------------|-------------|-----------------------------------------------|
| id           | UUID        | PK                                            |
| student_id   | UUID        | FK → students(id) ON DELETE CASCADE           |
| achievement_id| UUID       | FK → achievements(id) ON DELETE CASCADE       |
| unlocked_at  | TIMESTAMPTZ | NOT NULL DEFAULT now()                        |

**Unique:** `(student_id, achievement_id)`  
**Indexes:** `idx_student_achievements_student_id`

---

## 26. student_activity_events

Лента активности студента (звёзды, кристаллы, посещаемость, значки).

| Column          | Type                | Constraints                              |
|-----------------|---------------------|------------------------------------------|
| id              | UUID                | PK                                       |
| student_id      | UUID                | FK → students(id) ON DELETE CASCADE      |
| type            | activity_event_type | NOT NULL                                 |
| description     | TEXT                | NOT NULL                                 |
| stars_amount    | INTEGER             | NULL                                     |
| crystals_amount | INTEGER             | NULL                                     |
| subject_id      | UUID                | FK → subjects(id) ON DELETE SET NULL, NULL|
| linked_lesson_id| UUID                | FK → lessons(id) ON DELETE SET NULL, NULL |
| created_at      | TIMESTAMPTZ         | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_activity_events_student_id`, `idx_activity_events_created_at`

---

## ══════════════════════════════════
## CRM
## ══════════════════════════════════

## 27. funnels

| Column      | Type         | Constraints                   |
|-------------|--------------|-------------------------------|
| id          | UUID         | PK                            |
| name        | VARCHAR(255) | NOT NULL                      |
| is_archived | BOOLEAN      | NOT NULL DEFAULT false        |
| created_by  | UUID         | FK → users(id) ON DELETE SET NULL, NULL |
| created_at  | TIMESTAMPTZ  | NOT NULL DEFAULT now()        |
| updated_at  | TIMESTAMPTZ  | NOT NULL DEFAULT now()        |

---

## 28. stages

| Column          | Type         | Constraints                        |
|-----------------|--------------|------------------------------------|
| id              | UUID         | PK                                 |
| funnel_id       | UUID         | FK → funnels(id) ON DELETE CASCADE |
| name            | VARCHAR(100) | NOT NULL                           |
| color           | VARCHAR(20)  | NOT NULL DEFAULT '#6366F1'         |
| win_probability | INTEGER      | NOT NULL DEFAULT 0 CHECK (0..100)  |
| order           | INTEGER      | NOT NULL DEFAULT 0                 |

**Indexes:** `idx_stages_funnel_id`

---

## 29. lead_sources

| Column         | Type             | Constraints              |
|----------------|------------------|--------------------------|
| id             | UUID             | PK                       |
| name           | VARCHAR(255)     | NOT NULL                 |
| type           | lead_source_type | NOT NULL DEFAULT 'manual'|
| is_active      | BOOLEAN          | NOT NULL DEFAULT true    |
| webhook_url    | TEXT             | NULL                     |
| webhook_secret | VARCHAR(255)     | NULL                     |
| created_at     | TIMESTAMPTZ      | NOT NULL DEFAULT now()   |

---

## 30. leads

| Column           | Type        | Constraints                                    |
|------------------|-------------|------------------------------------------------|
| id               | UUID        | PK                                             |
| full_name        | VARCHAR(255)| NOT NULL                                       |
| phone            | VARCHAR(30) | NOT NULL                                       |
| email            | VARCHAR(255)| NULL                                           |
| source_id        | UUID        | FK → lead_sources(id) ON DELETE SET NULL, NULL |
| funnel_id        | UUID        | FK → funnels(id) ON DELETE CASCADE             |
| stage_id         | UUID        | FK → stages(id) ON DELETE SET NULL, NULL       |
| assigned_to      | UUID        | FK → users(id) ON DELETE SET NULL, NULL        |
| status           | lead_status | NOT NULL DEFAULT 'active'                      |
| lost_reason      | TEXT        | NULL                                           |
| custom_fields    | JSONB       | NOT NULL DEFAULT '{}'                          |
| last_activity_at | TIMESTAMPTZ | NULL                                           |
| created_at       | TIMESTAMPTZ | NOT NULL DEFAULT now()                         |
| updated_at       | TIMESTAMPTZ | NOT NULL DEFAULT now()                         |

**Indexes:** `idx_leads_funnel_id`, `idx_leads_stage_id`, `idx_leads_assigned_to`, `idx_leads_status`, `idx_leads_last_activity_at`

---

## 31. custom_fields

Схема кастомных полей для воронки (не значения, а определения полей).

| Column    | Type         | Constraints                        |
|-----------|--------------|------------------------------------|
| id        | UUID         | PK                                 |
| funnel_id | UUID         | FK → funnels(id) ON DELETE CASCADE |
| label     | VARCHAR(255) | NOT NULL                           |
| type      | cf_type      | NOT NULL                           |
| options   | JSONB        | NULL (for select/multiselect)      |
| order     | INTEGER      | NOT NULL DEFAULT 0                 |
| is_active | BOOLEAN      | NOT NULL DEFAULT true              |
| created_at| TIMESTAMPTZ  | NOT NULL DEFAULT now()             |

**Indexes:** `idx_custom_fields_funnel_id`

> Значения кастомных полей хранятся денормализованно в `leads.custom_fields` (JSONB)  
> для производительности и гибкости при изменении схемы

---

## 32. lead_activities

Активности в timeline лида (звонки, встречи, сообщения).

| Column           | Type          | Constraints                             |
|------------------|---------------|-----------------------------------------|
| id               | UUID          | PK                                      |
| lead_id          | UUID          | FK → leads(id) ON DELETE CASCADE        |
| type             | activity_type | NOT NULL                                |
| date             | TIMESTAMPTZ   | NOT NULL                                |
| outcome          | TEXT          | NOT NULL                                |
| notes            | TEXT          | NULL                                    |
| duration_minutes | INTEGER       | NULL                                    |
| channel          | VARCHAR(50)   | NULL                                    |
| needs_follow_up  | BOOLEAN       | NOT NULL DEFAULT false                  |
| created_by       | UUID          | FK → users(id) ON DELETE SET NULL, NULL |
| created_at       | TIMESTAMPTZ   | NOT NULL DEFAULT now()                  |

**Indexes:** `idx_lead_activities_lead_id`, `idx_lead_activities_date`

---

## 33. lead_stage_changes

История переходов по стадиям воронки.

| Column       | Type        | Constraints                             |
|--------------|-------------|-----------------------------------------|
| id           | UUID        | PK                                      |
| lead_id      | UUID        | FK → leads(id) ON DELETE CASCADE        |
| from_stage_id| UUID        | FK → stages(id) ON DELETE SET NULL, NULL|
| to_stage_id  | UUID        | FK → stages(id) ON DELETE SET NULL, NULL|
| changed_by   | UUID        | FK → users(id) ON DELETE SET NULL, NULL |
| changed_at   | TIMESTAMPTZ | NOT NULL DEFAULT now()                  |

**Indexes:** `idx_stage_changes_lead_id`

---

## 34. lead_assignment_changes

История смены ответственного менеджера.

| Column       | Type        | Constraints                             |
|--------------|-------------|-----------------------------------------|
| id           | UUID        | PK                                      |
| lead_id      | UUID        | FK → leads(id) ON DELETE CASCADE        |
| from_user_id | UUID        | FK → users(id) ON DELETE SET NULL, NULL |
| to_user_id   | UUID        | FK → users(id) ON DELETE SET NULL, NULL |
| changed_by   | UUID        | FK → users(id) ON DELETE SET NULL, NULL |
| changed_at   | TIMESTAMPTZ | NOT NULL DEFAULT now()                  |

**Indexes:** `idx_assignment_changes_lead_id`

---

## 35. lead_comments

| Column    | Type        | Constraints                             |
|-----------|-------------|-----------------------------------------|
| id        | UUID        | PK                                      |
| lead_id   | UUID        | FK → leads(id) ON DELETE CASCADE        |
| text      | TEXT        | NOT NULL                                |
| author_id | UUID        | FK → users(id) ON DELETE CASCADE        |
| created_at| TIMESTAMPTZ | NOT NULL DEFAULT now()                  |
| updated_at| TIMESTAMPTZ | NOT NULL DEFAULT now()                  |

**Indexes:** `idx_lead_comments_lead_id`

---

## 36. crm_tasks

Задачи менеджеров CRM.

| Column          | Type           | Constraints                              |
|-----------------|----------------|------------------------------------------|
| id              | UUID           | PK                                       |
| title           | VARCHAR(255)   | NOT NULL                                 |
| description     | TEXT           | NULL                                     |
| linked_lead_id  | UUID           | FK → leads(id) ON DELETE SET NULL, NULL  |
| assigned_to     | UUID           | FK → users(id) ON DELETE CASCADE         |
| due_date        | TIMESTAMPTZ    | NOT NULL                                 |
| priority        | task_priority  | NOT NULL DEFAULT 'medium'                |
| status          | task_status_crm| NOT NULL DEFAULT 'pending'               |
| reminder_at     | TIMESTAMPTZ    | NULL                                     |
| is_auto_created | BOOLEAN        | NOT NULL DEFAULT false                   |
| created_by      | UUID           | FK → users(id) ON DELETE SET NULL, NULL  |
| created_at      | TIMESTAMPTZ    | NOT NULL DEFAULT now()                   |
| updated_at      | TIMESTAMPTZ    | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_crm_tasks_assigned_to`, `idx_crm_tasks_lead_id`, `idx_crm_tasks_status`, `idx_crm_tasks_due_date`

---

## 37. crm_notifications

Уведомления для пользователей CRM.

| Column         | Type          | Constraints                              |
|----------------|---------------|------------------------------------------|
| id             | UUID          | PK                                       |
| user_id        | UUID          | FK → users(id) ON DELETE CASCADE         |
| type           | notif_type_crm| NOT NULL                                 |
| title          | VARCHAR(255)  | NOT NULL                                 |
| body           | TEXT          | NULL                                     |
| is_read        | BOOLEAN       | NOT NULL DEFAULT false                   |
| linked_task_id | UUID          | FK → crm_tasks(id) ON DELETE SET NULL, NULL |
| created_at     | TIMESTAMPTZ   | NOT NULL DEFAULT now()                   |

**Indexes:** `idx_crm_notifications_user_id`, `idx_crm_notifications_is_read`

---

## Relationships Summary

```
users (1) ──────── (0..1) students          [user_id]
users (1) ──────── (*) groups               [teacher_id]
users (1) ──────── (*) salary_calculations  [teacher_id]
users (1) ──────── (*) mup_tasks            [assigned_to]
users (1) ──────── (*) lms_notifications    [user_id]
users (1) ──────── (*) leads                [assigned_to]
users (1) ──────── (*) crm_tasks            [assigned_to]
users (1) ──────── (*) crm_notifications    [user_id]

directions (1) ──── (*) subjects            [direction_id]
directions (1) ──── (*) groups              [direction_id]

subjects (1) ────── (*) groups              [subject_id]
subjects (1) ────── (*) lessons             [subject_id]

groups (1) ─────── (*) enrollments         [group_id]
groups (1) ─────── (*) lessons             [group_id]

students (*) ────── (*) groups              via enrollments
students (1) ────── (*) attendance_records  [student_id]
students (1) ────── (*) grade_records       [student_id]
students (1) ────── (*) diamond_records     [student_id]
students (1) ────── (*) homework_submissions[student_id]
students (1) ────── (*) payments            [student_id]
students (1) ────── (*) coin_transactions   [student_id]
students (1) ────── (*) risk_factors        [student_id]
students (*) ────── (*) achievements        via student_achievements
students (1) ────── (*) student_activity_events [student_id]

lessons (1) ─────── (*) attendance_records  [lesson_id]
lessons (1) ─────── (*) grade_records       [lesson_id]
lessons (1) ─────── (*) diamond_records     [lesson_id]
lessons (1) ─────── (*) lesson_materials    [lesson_id]
lessons (1) ─────── (*) homework_assignments[lesson_id]

homework_assignments (1) ── (*) homework_submissions [assignment_id]

funnels (1) ────── (*) stages               [funnel_id]
funnels (1) ────── (*) leads                [funnel_id]
funnels (1) ────── (*) custom_fields        [funnel_id]

leads (1) ─────── (*) lead_activities       [lead_id]
leads (1) ─────── (*) lead_stage_changes    [lead_id]
leads (1) ─────── (*) lead_assignment_changes[lead_id]
leads (1) ─────── (*) lead_comments         [lead_id]
leads (1) ─────── (*) crm_tasks             [linked_lead_id]
```

---

## Table Count Summary

| System           | Tables |
|------------------|--------|
| Core / Shared    | 1 (users) |
| LMS (Logbook)    | 22 (students → risk_factors) |
| Gamification     | 3 (achievements, student_achievements, student_activity_events) |
| CRM              | 11 (funnels → crm_notifications) |
| **Total**        | **37** |
