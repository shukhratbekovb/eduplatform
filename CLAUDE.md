# EduPlatform — Claude Context

## Project Overview

Education platform with 3 frontends (Next.js 14) + 1 backend (FastAPI/Python 3.13) + infrastructure (PostgreSQL, Redis, RabbitMQ, Google Cloud Storage).

## Architecture

```
eduplatform/
├── backend/          FastAPI, Python 3.13, Poetry, Clean Architecture
├── crm/              Next.js 14 — CRM for sales (port 3000)
├── logbook/          Next.js 14 — Teacher logbook (port 3001)
├── student/          Next.js 14 — Student portal (port 3002)
└── docker-compose.yml
```

**Backend stack:** FastAPI 0.115 + SQLAlchemy 2 (async) + Alembic + Celery + Redis + RabbitMQ + Google Cloud Storage
**Frontend stack:** Next.js 14 + TypeScript + TanStack Query + Zustand + Tailwind + Radix UI + shadcn

## Running

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
# Seed (optional — creates 300 students, 12 teachers, 10 directions, 30 groups, 328 lessons, CRM data):
docker compose exec api bash -c "mkdir -p /app/scripts"
docker cp backend/scripts/seed.py eduplatform-api-1:/app/scripts/seed.py
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed.py"
```

Ports: API :8000, CRM :3000, Logbook :3001, Student :3002

Default login: `director@edu.uz` / `password123`

## Key Entity Relationships

### Groups
- Groups have `direction_id` (FK to directions). NO `subject_id`, NO `teacher_id` on group.
- Teacher belongs to **lesson**, not group.
- Subject belongs to **lesson**, not group.

### Lessons
- `group_id`, `subject_id`, `teacher_id`, `room_id`, `scheduled_at`, `duration_minutes`, `status`
- Status enum: `scheduled`, `completed`, `cancelled`
- Subject is auto-resolved from group's direction when creating via LessonForm

### Staff (Users)
- `phone` and `date_of_birth` fields on UserModel
- Teachers assigned to subjects via `subjects.teacher_id`
- Staff created with auto-generated password (Apple-style: uppercase+lowercase+digit+special)
- Email stub for credential delivery

### Students
- `groupCount` field computed from active enrollments (bulk query)
- `gpa` and `attendance_percent` recalculated on each lesson conduct
- Enrolled in groups via `enrollments` table

## API Routes

### Auth
- POST /auth/login, /auth/logout, /auth/refresh, /auth/me, /auth/change-password
- POST /auth/users (create user — director only)

### LMS Catalog (prefix /lms)
- /lms/directions — CRUD + /archive. DirectionIn accepts: name, description, durationMonths, totalLessons
- /lms/subjects — CRUD + /archive. Query param `directionId` (camelCase alias). SubjectIn accepts: name, directionId, teacherId
- /lms/rooms — CRUD + DELETE (soft delete)
- All responses in camelCase via `CamelModel(alias_generator=to_camel)`

### LMS Users (prefix /lms)
- GET /lms/users — list staff (excludes students). Supports `?role=teacher`
- GET /lms/users/{id} — detail with subjects, lessonsThisMonth
- POST /lms/users — create with auto-generated password. Returns `generatedPassword`
- PATCH /lms/users/{id} — update name, email, phone, dateOfBirth, role
- POST /lms/users/{id}/reset-password — generates new password
- POST /lms/users/{id}/subjects — assign subject to teacher
- PUT /lms/users/{id}/subjects — bulk assign subjects
- DELETE /lms/users/{id}/subjects/{subjectId} — unassign
- GET /lms/users/{id}/directions — teacher's directions (from subjects)

### LMS Groups (prefix /lms)
- GET/POST /lms/groups — CRUD. Supports `directionId`, `teacherId` query filters (camelCase aliases)
- GroupResponse: id, name, directionId, directionName, roomId, startDate, endDate, schedule, isActive, studentCount
- GET /lms/groups/{id}/students — enrolled students
- GET /lms/groups/{id}/lessons — group lessons
- POST /lms/groups/{id}/archive

### LMS Lessons (prefix /lms)
- POST /lms/lessons — create single. Validates: subject-direction match, teacher/room/group conflicts
- POST /lms/lessons/bulk — create series by weekdays in date range. Skips conflicting dates
- GET /lms/lessons — list with filters: groupId, teacherId, roomId, status, weekStart/weekEnd (camelCase aliases)
- PATCH /lms/lessons/{id} — edit (blocked if completed or past day)
- DELETE /lms/lessons/{id} — delete (blocked if completed)
- POST /lms/lessons/{id}/conduct — save attendance + grades + diamonds. Validates edit window (same day). Recalculates student GPA/attendance
- POST /lms/lessons/{id}/cancel
- Materials: GET/POST/DELETE /lms/lessons/{id}/materials

### LMS Students (prefix /lms)
- GET /lms/students — paginated. Supports `teacherId` filter (shows students from teacher's direction groups)
- StudentResponse includes `groupCount`
- GET /lms/students/{id}/groups — currentGroups + availableGroups (uses group.direction_id)
- POST /lms/students/{id}/enroll — with direction constraint check
- POST /lms/students/{id}/transfer

### LMS Enrollments (prefix /lms)
- POST /lms/enrollments — enroll student in group (student_id + group_id)
- DELETE /lms/enrollments/{id} — drop student

### LMS Exams (prefix /lms)
- GET/POST/DELETE /lms/exams — CRUD. Auto-resolves subject from group's lessons
- GET /lms/exams/{id}/students — eligible students (enrolled in group)
- GET /lms/exams/{id}/grades — exam grades
- POST /lms/exams/{id}/grades — save grades (uses `exam_id` column in grade_records, type="exam")
- Grades scale: 0-10

### LMS Late Requests (prefix /lms)
- GET /lms/late-requests — list with `?status=pending|approved|rejected`, `?teacherId=`
- POST /lms/late-requests — teacher creates request (lessonId + reason)
- POST /lms/late-requests/{id}/review — MUP/Director approves/rejects (`{approved: true/false}`)
- Model: `is_approved` (bool|null), `reviewed_by`, `reviewed_at`

### LMS Reports (prefix /lms)
- GET /lms/reports/teacher-hours — by month/year. Groups by teacher → subjects. Returns hours + minutes
- GET /lms/reports/performance — by group. Average GPA + attendance
- GET /lms/reports/by-direction — lessons by direction
- GET /lms/reports/income — placeholder
- GET /lms/reports/available-periods — years + months with lessons (for filter dropdowns)
- PDF generation on frontend via jspdf + jspdf-autotable (Roboto font for Cyrillic)

### LMS Compensation (prefix /lms)
- GET /lms/compensation — list compensation models per teacher
- PUT /lms/compensation/{teacherId} — set model (per_lesson/fixed_monthly/per_student + rate)
- GET /lms/salaries — list salary calculations
- POST /lms/salaries/calculate — calculate salary for teacher+period
- Model: CompensationModelModel (teacher_id, type, rate, effective_from)
- SalaryCalculationModel (teacher_id, period_month, period_year, lessons_conducted, amounts)

### LMS Analytics (prefix /lms)
- /lms/analytics/overview — totalStudents, activeGroups, lessonsThisWeek, avgAttendance, etc.
- /lms/analytics/attendance, /grades, /risk, /homework, /teachers

### File Upload
- POST /files/upload — multipart upload to Google Cloud Storage. Returns {key, url, filename, contentType, sizeBytes}
- POST /files/upload-multiple — multiple files at once
- Config: GCS_BUCKET_NAME, GCS_CREDENTIALS_JSON (mounted in Docker)
- Lazy initialization — GCS client created on first upload, not at import

### CRM (prefix /crm)
- /crm/leads — full CRUD + /move-stage, /assign, /mark-won, /mark-lost, /timeline
- /crm/lead-sources — CRUD (4 types: manual, import, api, landing)
- /crm/contacts, /crm/funnels, /crm/tasks, /crm/activities, /crm/notifications
- /crm/contracts — CRUD with directions from LMS
- /crm/analytics — N+1 queries fixed with bulk GROUP BY

### Public (no auth)
- GET /public/forms/{api_key}, POST /public/forms/{api_key}/submit
- POST /public/api/{api_key}/leads

### Student Portal (prefix /student)
- Uses `lesson.subject_id` (not group.subject_id) for subject resolution

## Key Technical Decisions

### Timezone Handling
- `scheduled_at` stored as `timestamp with time zone` in UTC
- Conduct validation compares **dates only** (not times) to avoid timezone issues between Docker (UTC) and user (UTC+5)
- `isLessonEditable`: from lesson start until end of that day (23:59)
- `needsLateRequest`: after the lesson day has passed

### CamelCase API
- All new endpoints use `CamelModel` with `alias_generator=to_camel, populate_by_name=True`
- Query params use `Query(alias="camelCase")` for FastAPI
- Legacy endpoints mix snake_case responses — being migrated

### Grades
- Scale: 0-10 (max_score=10)
- `grade_records` table has both `lesson_id` (FK lessons) and `exam_id` (FK exams)
- Grade type enum: homework, exam, quiz, project, participation
- Attendance status enum: present, absent, late, excused

### Teacher Filtering (Role-based views)
- Schedule: auto-filters by `teacherId` for teachers
- Students: `teacherId` param → shows students from teacher's direction groups
- Groups: `teacherId` param → shows groups from teacher's directions
- Reports: teachers see only their own hours
- Directions dropdown: filtered by teacher's subjects

### FastAPI 0.115 + `from __future__ import annotations` + 204 status
All 204 routes use `-> Response:` return type and `return Response(status_code=204)`.

### Zustand hydration fix
All 3 frontends use `_hasHydrated` flag with `onRehydrateStorage` callback.

### Password hashing
Uses `bcrypt` directly (not passlib) — passlib incompatible with bcrypt 4.x on Python 3.13.

### Docker
- Backend Dockerfile: Python 3.13-slim, needs `g++` for greenlet
- Frontend Dockerfiles: `mkdir -p public` before build
- GCS credentials mounted: `./backend/gcp_keys.json:/app/gcp_keys.json:ro`
- Backend src hot-reload: `./backend/src:/app/src`

### DB enum handling
All SAEnum in models use `create_type=False`. Single migration 0001 creates all tables.

## Migration (0001_initial.py)
Single migration file. Key tables:
- users (with phone, date_of_birth)
- directions, subjects, rooms
- groups (with direction_id, NO subject_id, NO teacher_id)
- lessons (with subject_id, teacher_id)
- students (with full_name, email, photo_url, is_active)
- enrollments, attendance_records, grade_records (with exam_id), diamond_records
- homework_assignments, homework_submissions
- late_entry_requests (student_id nullable)
- compensation_models, salary_calculations
- exams (with description, subject_id nullable)
- funnels, stages, leads, lead_sources, crm_contacts, contracts
- contract_files, student_documents
- All CRM tables with proper indexes

## Tests (292 unit tests)
Run: `cd backend && poetry run pytest tests/unit/ -v`

## Seed Data
Creates: 10 directions (IT-focused), 29 subjects, 12 teachers, 300 students, 30 groups, 328 lessons, CRM data.
All passwords: `password123`

## Frontend-Backend Field Mapping

### Lesson Conduct Request
```json
{
  "topic": "string",
  "attendance": [{"studentId": "uuid", "status": "present|absent|late", "note": "?"}],
  "grades": [{"studentId": "uuid", "grade": 0-10, "comment": "?"}],
  "diamonds": [{"studentId": "uuid", "diamonds": 1-5}]
}
```

### Late Request Flow
1. Teacher: POST /lms/late-requests {lessonId, reason}
2. MUP/Director: POST /lms/late-requests/{id}/review {approved: true/false}
3. Conduct checks for approved late request when day has passed

### Schedule Calendar
- Hours 0-23, HOUR_HEIGHT=80px
- Multiselect filters for teachers and rooms (client-side filtering)
- Lesson card shows: group name, subject, teacher (full name), room
- Click opens detail modal (edit/delete with validation)
