# EduPlatform — Claude Context

## Что это за проект

Платформа для IT-учебного центра. 3 фронтенда + 1 бэкенд + инфра. Центр обучает IT-направлениям (Python, JS, Java, Mobile, DevOps, Data Science, Кибербезопасность, UI/UX, English IT, Робототехника).

Валюта: **UZS (сум)**. Никаких ₸ нигде.

```
eduplatform/
├── backend/     FastAPI + Python 3.13 + SQLAlchemy 2 async + Alembic + PostgreSQL
├── crm/         Next.js 14 — CRM для продажников (port 3000)
├── logbook/     Next.js 14 — Журнал преподавателя / управление (port 3001)
├── student/     Next.js 14 — Портал студента (port 3002)
└── docker-compose.yml
```

## Как запустить

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
```

GCS credentials: `./backend/gcp_keys.json` монтируется в `/app/gcp_keys.json`

Дефолтный логин: `director@edu.uz` / `password123`

## Что уже сделано (хронология)

### Фаза 1: Основа
- DDD domain layer (entities, value objects, specifications, policies)
- Пароли Apple-style (specification pattern)
- 292 юнит-теста
- Docker deployment, seed script

### Фаза 2: CRM
- Воронки, этапы, лиды, источники (manual/import/api/landing)
- Контакты автосоздаются по телефону
- Аналитика (sankey, managers, sources, conversion, loss reasons)
- Договоры (contract → student account auto-creation)
- N+1 оптимизация (6 мест исправлено bulk GROUP BY)
- i18n (ru/en), кастомные Radix Select

### Фаза 3: LMS — Группы и уроки
- **Группы** имеют `direction_id`. НЕ имеют `subject_id` и `teacher_id` — они убраны.
- **Предмет** и **преподаватель** привязаны к **уроку**, не к группе.
- Создание урока: каскад направление → группы (фильтр) → предмет (фильтр) → преподаватель (авто по предмету)
- Валидация: конфликт преподавателя/кабинета/группы по времени, предмет должен совпадать с направлением группы
- Серия уроков (bulk create по дням недели)
- Расписание: часы 0-23, HOUR_HEIGHT=80px, мультиселект фильтры
- Карточка урока в календаре: группа, предмет, преподаватель, кабинет
- Клик на карточку → модалка (просмотр/редактировать/удалить)
- Conduct: сохраняет посещаемость + оценки (0-10) + бриллианты, пересчитывает GPA/attendance студентов

### Фаза 4: LMS — Персонал
- Карточки сотрудников, полноценная страница `/staff/[id]`
- День рождения, телефон на UserModel
- Авто-генерация пароля, email-заглушка
- Предметы по направлениям (группировка), мультиселект назначения предметов
- Уроки за текущий месяц (статистика)

### Фаза 5: LMS — Роли и фильтрация
- **Преподаватель** видит только свои уроки/студентов/группы (через `teacherId` → subjects → directions)
- Dropdown направлений фильтруется по предметам преподавателя
- Посещаемость: `teacherId` передаётся в API
- Отчёты: преподаватель видит только "Мои часы"

### Фаза 6: LMS — Отчёты
- Часы преподавателей: таблица (преподаватель → предметы → кол-во → часы:мин)
- Фильтр месяц/год (Radix Select), кнопка "Сформировать" + PDF
- PDF: jspdf + jspdf-autotable, шрифты Roboto Regular + Bold в `public/fonts/`
- Успеваемость по группам, по направлениям
- `/lms/reports/available-periods` для dropdown'ов фильтров

### Фаза 7: LMS — Экзамены
- CRUD, auto-resolve предмета из уроков группы
- Оценки за экзамен через `exam_id` в `grade_records` (отдельная колонка от `lesson_id`)
- Модалка для выставления оценок

### Фаза 8: LMS — Запросы на позднее внесение
- Преподаватель создаёт запрос (lessonId + reason)
- МУП/Директор одобряет (`{approved: true/false}`)
- `is_approved` (bool|null), `reviewed_by`, `reviewed_at`
- Conduct проверяет approved request когда день прошёл

### Фаза 9: LMS — Финансы
- Поиск студента → договоры → оплата по договору
- `PaymentModel` с `contract_id`, `description`
- Способы: наличные, карта, перевод, Payme, Click
- Договор показывает `paidTotal` (сумма оплат)
- Доступ: директор + кассир

### Фаза 10: Файлы и материалы
- Google Cloud Storage (не MinIO)
- `POST /files/upload` — multipart, `POST /files/upload-multiple`
- Lazy init GCS клиента, no `make_public()` (Uniform Access)
- В уроке: вкладка "Материалы" (загрузка файлов) + "Домашнее задание" (название + описание + дедлайн + файлы)

### Фаза 11: Student Portal
- Логин работает (был баг: `user.role.value` → `user.role` — строка, не enum)
- `Input` компонент с `forwardRef` (иначе react-hook-form не работает)
- Расписание в стиле logbook (было CSS grid, стало absolute positioning)
- `Lesson.subjectId` nullable

### Фаза 12: Компенсация
- `CompensationModelModel`: `teacher_id`, `type`, `rate`, `effective_from`
- PUT `/lms/compensation/{teacherId}` — upsert
- `SalaryCalculationModel`: `period_month`, `period_year`, `lessons_conducted`

### Фаза 13: Финансовый блок (полная переработка)
- **Автогенерация графика платежей** при создании контракта: N записей PaymentModel с due_date (от start_date + step по payment_type)
- `paid_amount` + `period_number` добавлены в PaymentModel
- **Частичная оплата**: `POST /payments/{id}/pay` — добавляет к paid_amount, при full → status=paid
- **Авто-overdue**: pending платежи с прошедшей due_date автоматически → overdue при запросе
- **Баланс контракта**: `GET /payments/contract-balance/{contract_id}` — totalExpected/totalPaid/remaining/overdue
- **Student finance dashboard**: `GET /student/finance` — полный кабинет с контрактами, графиком, балансом
- Logbook Finance page переписана: прогресс-бары, раскрывающийся график, кнопка "Оплатить" на конкретный платёж
- Student Portal Payment page: 3 вкладки (Предстоящие / По договорам / История), карточки баланса

### Фаза 14: Финансовые отчёты
- `GET /lms/reports/finance/income` — доходы по месяцам/направлениям + тренд за год
- `GET /lms/reports/finance/debtors` — список должников с суммой долга и просрочкой
- `GET /lms/reports/finance/forecast` — прогноз поступлений на 1-12 месяцев
- `GET /lms/reports/finance/contracts-summary` — сводка по договорам (стоимость, сбор %, по направлениям)
- `GET /lms/reports/finance/dashboard-stats` — лёгкий endpoint для карточек дашборда
- Все отчёты доступны только директору и кассиру (CashierGuard)
- PDF экспорт для доходов и должников
- Финансовые карточки на дашборде директора и кассира

### Фаза 15: Аналитика — финансовая секция
- На странице `/analytics` добавлена секция "Финансы" (только для директора/кассира)
- 4 KPI карточки + bar chart доходов по месяцам + pie chart по направлениям + таблица должников

### Фаза 16: DatePicker
- Кастомный компонент `DatePicker` на date-fns (без внешних библиотек)
- 3-уровневая навигация: Дни → Месяцы (клик на заголовок) → Годы (клик на год)
- Русская локаль, кнопка "Сегодня", min/max dates
- Заменены ВСЕ нативные `<input type="date">`: logbook (12 мест), CRM (4 места)

### Фаза 17: Карточки уроков в расписании
- Иконки: Users (группа), BookOpen (предмет), UserCheck (преподаватель), MapPin (кабинет)
- Увеличен шрифт: text-[10px] → text-xs/text-sm
- Одинаково в logbook и student portal

### Фаза 18: Оценки, домашки, материалы — сквозной flow
- **GPA 10-балльная шкала**: `score / max_score * 10` (было * 12)
- **Demo mode отключён** для реальных логинов (adapter сбрасывается)
- **Student Performance page**: добавлена таблица всех оценок по датам с типами и цветами
- **Homework flow исправлен**:
  - `POST /homework/submissions/{id}/review` — alias для grade (logbook frontend)
  - Submit endpoint — поиск по sub.id ИЛИ assignment_id
  - `assign.type` → хардкод "homework" (HomeworkAssignmentModel не имеет type)
  - Grade sync: homework оценка → GradeRecordModel → GPA пересчитан
  - Статус mapping: graded ↔ reviewed
  - Auto-overdue для просроченных домашек
  - Auto-submissions при создании задания (для всех enrolled студентов)
- **Materials page** (student portal): переписана как аккордеон по урокам
  - `GET /student/lessons-materials` — уроки с вложенными материалами
  - Раскрытие урока → список файлов с типами и кнопками скачивания
- **Баг-фиксы**: GroupModel.subject_id не существует, AttendanceRecordModel.created_at не существует, LessonMaterialModel.uploaded_at → created_at, subjectName добавлен в materials API

### Фаза 19: Файлы — GCS Signed URLs + Proxy Download
- **Signed URLs**: при upload генерируется подписанная ссылка (7 дней) с Content-Disposition: attachment
- **Proxy download**: `GET /files/download?key=...&filename=...` — стримит файл через backend
- Кириллические имена: `filename*=UTF-8''` (RFC 5987)
- `GET /files/url?key=...` — получить свежую signed URL
- `file_urls` (JSONB) добавлен в HomeworkAssignmentModel — файлы задания от преподавателя
- Student portal: кнопка "Скачать" через proxy, "Открыть" для ссылок
- Logbook: "Загрузить файлы" + "Добавить ссылку" + "Скачать" через proxy
- `s3_key` + `key` передаётся и сохраняется при upload

### Фаза 20: Домашки — полный flow с файлами
- Преподаватель: создаёт ДЗ с файлами → auto-submissions для студентов → видит ответы с текстом/файлом → проверяет с оценкой
- Студент: видит файлы задания → скачивает → загружает свой файл + текст → отправляет
- Просроченные: студент может сдать overdue ДЗ → статус `submitted` (не overdue), преподаватель видит `is_late` flag
- GradeRecord создаётся автоматически → GPA пересчитан

### Фаза 21: Геймификация
- **Gamification Engine** (`gamification_engine.py`):
  - Автоначисление при conduct: +5⭐ present, -2⭐ late, +10⭐ оценка 9-10, +5⭐ оценка 7-8
  - Серии посещений: +5💎 за 5 подряд, +15💎 за 10 подряд
  - Homework: +15⭐ за своевременную сдачу, +20⭐ за оценку 9-10, +10⭐ за 7-8
  - Преподаватель может вручную начислять 💎 через conduct (DiamondIn)
  - Описания конкретные: "Оценка 10/10 за «Тест геймификации»"
- **Auto badge progression**: Bronze(0) → Silver(100⭐) → Gold(300) → Platinum(600) → Diamond(1000)
- **Auto achievement unlocking** (7 ачивок с триггерами):
  - first_grade, five_tens, gpa_9, ten_present, thirty_present, ten_homework, leaderboard_first
- **Магазин наград**: ShopItemModel + StudentPurchaseModel
  - `GET /gamification/shop` — каталог товаров
  - `POST /gamification/shop/purchase` — покупка (списание ⭐/💎, проверка баланса/наличия)
  - 5 товаров: стикерпак, сертификат, скидка, футболка, бесплатный урок
- **Achievement catalog**: `GET /gamification/achievements/catalog` — все ачивки с unlocked/locked статусом
- **Student Portal**:
  - Achievements page: каталог ачивок (цветные unlocked + серые locked с замком)
  - Shop page: товары с ценами, баланс, кнопка "Купить"
  - TopBar: звёзды + бриллианты из dashboard API (live данные)
  - Activity feed: лента начислений со скроллом
  - Leaderboard: рейтинг по звёздам

### Фаза 22: Student Portal Dashboard — виджеты
- **StatsCards**: Средний балл/10, Посещаемость %, Задания к выполнению, Выполнено вовремя
- **GradesWidget**: последние оценки с типом (Урок/Д/З/Экзамен) + название урока
- **AttendanceWidget**: present/absent/late %
- **TodaySchedule**: расписание на сегодня с подсветкой текущего урока (пульсирующая точка "Сейчас")
- **UpcomingDeadlines**: ближайшие дедлайны (overdue красные, urgent жёлтые, обратный отсчёт)
- **ActivityFeed**: лента начислений звёзд/бриллиантов
- **Leaderboard**: рейтинг по звёздам в группе

### Фаза 23: Удаление demo данных
- Удалены `src/lib/demo/` папки из всех 3 фронтендов (data.ts + adapter.ts)
- Удалены DemoBanner компоненты
- Убраны isDemoMode, enableDemo, demoRole из auth stores
- Login pages: только реальный логин, без демо-кнопок
- Layouts: без проверки isDemoMode

### Фаза 24: Разделение ролей — Директор/МУП vs Преподаватель
- **Conduct урока** — кнопка "Сохранить и закрыть урок" скрыта для директора/МУП (только преподаватель может проводить)
- **Посещаемость** — директор/МУП видят только вкладку "Посещаемость групп", вкладка поурочной отметки и DatePicker скрыты
- **Домашние задания** — директор/МУП по умолчанию видят сводки:
  - "По преподавателям": reviewed, awaitingReview (сдано но не проверено), notSubmitted, overdue, % проверки
  - "По студентам": total, graded, submitted, pending, overdue, avgScore, completionRate%
  - "Все работы" — список всех submissions с возможностью просмотра
- Backend: `GET /lms/analytics/homework-by-teacher` — реализован (был stub)
- Backend: `GET /lms/analytics/homework-by-student` — новый endpoint

### Фаза 25: ML Student Risk Scoring
- **Синтетический датасет**: `scripts/generate_risk_dataset.py` — 5000 студентов, 5 архетипов (strong/average/struggling/declining/at_risk)
- **Обучение модели**: `scripts/train_risk_model.py` — GradientBoostingClassifier + CalibratedClassifierCV, ROC-AUC **0.93**
- **14 признаков из 4 доменов**: посещаемость (4), оценки (4), домашки (3), платежи (3)
- **ML-пакет** (`src/ml/`): `feature_extractor.py` (async DB queries), `predictor.py` (singleton joblib), `risk_scorer.py` (orchestrator)
- **Интеграция**: `RiskCalculationPolicy.from_probability()` + fallback на legacy пороги
- **Celery**: ночной batch `recalculate_all_students_risk` + событийный `recalculate_student_risk`
- **API**: `GET /students/{id}/risk` — детальная разбивка по доменам (attendanceScore, gradesScore, homeworkScore, paymentScore)
- **UI**: прогресс-бар вероятности отчисления + 4 доменные карточки на странице студента
- Dependencies: `scikit-learn ^1.5`, `joblib ^1.4`, `numpy ^2.0`

### Фаза 26: Комплексный Seed
- **`scripts/seed_full.py`** — 200 студентов, 730 уроков, 4272 attendance, 4538 grades, 256 ДЗ, 200 контрактов, 1200 платежей
- Логическая целостность: преподаватели ведут ТОЛЬКО предметы своего направления, студенты в группах по направлению контракта
- 5 архетипов для ML-разнообразия: strong (30%), average (25%), struggling (20%), declining (15%), at_risk (10%)
- **`scripts/run_ml_scoring.py`** — ML-скоринг после seed
- **`scripts/recalc_gamification.py`** — пересчёт звёзд/кристаллов/значков из реальных данных
- PostgreSQL порт 5433 (внешний) для PgAdmin

### Фаза 27: Геймификация в Seed (fix)
- Seed вставлял attendance/grades через SQL без вызова gamification_engine → stars=0
- `recalc_gamification.py` — bulk-пересчёт: 294.6 avg stars, 11.3 avg crystals, 4 platinum / 65 gold / 96 silver / 35 bronze
- 582 достижения разблокировано, 1195 activity events

### Фаза 28: Автоматические уведомления
- **3 новых Celery-задачи** (LMS → директор/МУП):
  - `notify_overdue_debts` — ежедневная сводка должников
  - `notify_risk_changes` — уведомления о HIGH/CRITICAL студентах
  - `notify_homework_overdue` — еженедельная сводка просроченных ДЗ
- `send_payment_due_reminders` активирован в beat_schedule
- **Notification Bell** в topbar logbook — уже работал, добавлена ссылка "Все уведомления"
- **`/notifications` page** — полная страница с фильтрами all/unread
- **Dashboard widget** — секция "Уведомления" на дашборде директора/МУП
- Notification type передаётся корректно (debt_alert, risk_alert, homework_overdue)

### Фаза 29: Аналитика (fix)
- **Посещаемость** — endpoint возвращал `[]`, написан реальный SQL (GROUP BY дата, `attendanceRate`)
- **Средний балл по предметам** — был grade distribution, переписан на `AVG(score/max_score*10) GROUP BY subject`
- **Эффективность преподавателей** — переименованы поля (`lessonsScheduled`/`lessonsConducted`/`conductRate`)

### Фаза 30: Задачи МУП + Автозадачи через RabbitMQ
- **MupTaskModel** расширен: `status`, `priority`, `student_id`, `category`
- **3 Celery-задачи автогенерации**:
  - `process_lesson_attendance` — после conduct через `.delay()`: 3+ пропусков → задача "Связаться с родителями"
  - `generate_debt_tasks` — ежедневно: просрочка > 30 дней → задача
  - `generate_risk_tasks` — ежедневно: HIGH/CRITICAL → задача "Провести беседу"
- Дедупликация через `_task_exists(student_id, category)`
- **TaskCard** — приоритет (цветная метка), иконка категории, ссылка на студента
- Trigger flow: conduct_lesson → Celery `.delay()` → RabbitMQ → Worker → MUP task + notification

### Фаза 31: Профиль пользователя (LMS + CRM + Student Portal)
- **Backend**: `GET /auth/me` и `PATCH /auth/me` расширены полями `phone`, `dateOfBirth`
- **LMS TopBar**: пункт "Профиль" → выдвижная панель (аватар, email, телефон, дата рождения, смена пароля)
- **CRM TopBar**: аналогичная панель профиля
- **Student Portal**: смена пароля исправлена — были UI-заглушки без state/onChange/API call

### Фаза 32: Контроль доступа по ролям
- **Backend** — `require_platform()` dependency на уровне роутера:
  - LMS: director, mup, teacher, cashier
  - CRM: director, sales_manager
  - Student Portal: student
- **Frontend** — проверка роли после логина, блокировка с сообщением
- **Login ошибки разделены**: `user_not_found` / `wrong_password` / `account_deactivated` / `accessDenied`

### Фаза 33: Мультиязычность (i18n) — Logbook
- **Инфраструктура**: `useI18nStore` (Zustand + persist), `useT()` hook, `ru.ts` + `en.ts` (~500 ключей)
- **Переключатель RU/EN** в topbar
- **Все 19 страниц** + все компоненты + модальные окна + toast-сообщения переведены
- Sidebar, Topbar, Dashboard, Students, Analytics, Tasks, Notifications, Schedule, Attendance, Homework, Finance, Groups, Reports, Settings, Staff, Exams, Compensation, Late Requests, Materials, Works
- Компоненты: RiskBadge, LessonStatusBadge, TaskCard, ScheduleColumn, StudentForm, GroupForm, LessonForm, AttendanceTable, DiamondDistributor, GradeInput, DatePicker, ConfirmDialog и др.
- PDF-генерация оставлена на русском

### Фаза 34: Мультиязычность (i18n) — Student Portal
- Замена всех `lang === 'ru' ? ... : ...` тернарников на `t()` вызовы
- Обновлены: performance, schedule, homework, materials, shop, payment (6 страниц)
- Компоненты: GradesWidget, TodaySchedule, UpcomingDeadlines, TopBar, ProfileDropdown
- Удалены локальные GRADE_TYPE_LABELS, PAYMENT_TYPE_LABELS — заменены на i18n ключи

### Фаза 35: Документация (Google-style docstrings)
- **Backend (45 файлов)**: полный Google-style на русском для каждой функции (Args, Returns, Raises, Example)
  - Domain: 8 файлов (entities, policies, events, value objects)
  - Application: 3 файла (use cases, repositories interfaces)
  - API: 11 файлов (все routers + dependencies + schemas)
  - Infrastructure: 6 файлов (models, services)
  - ML: 4 файла (feature_extractor, predictor, risk_scorer)
  - Workers: 5 файлов (celery_app, risk, notifications, auto_tasks, salary)
  - Config/Scripts: 8 файлов (main, config, database, seed, training, scoring)
- **Frontend (15 файлов)**: JSDoc на русском для ключевых компонентов
  - Logbook: layout, sidebar, topbar, dashboard, students, analytics, tasks, notifications, auth store, i18n
  - CRM: topbar
  - Student: ProfileDropdown, dashboard

### Фаза 36: README файлы
- **Главный README.md** — о проекте, стек, быстрый старт, матрица доступа, ключевые фичи
- **backend/README.md** — все зависимости с версиями, структура Clean Architecture, API endpoints, ML model
- **logbook/README.md** — 17 библиотек, 19 страниц, компоненты, i18n
- **crm/README.md** — 16 библиотек, все страницы, функциональность
- **student/README.md** — 13 библиотек, 7 виджетов дашборда, геймификация

## Критические вещи которые нельзя забывать

### Timezone
- Docker в UTC, пользователь в UTC+5 (Ташкент)
- `scheduled_at` хранится в UTC
- **Conduct/edit проверяет ДАТЫ, не время** (`now.date()` vs `sched.date()`)
- Если сравнивать по времени — преподаватель не сможет отметить урок 17:00 потому что сервер в 12:00 UTC

### Окно ввода данных
- Преподаватель может отметить урок **в день урока** (до 23:59)
- После дня урока — нужен одобренный запрос МУП
- Директор/МУП обходят это ограничение

### Enum'ы (что в БД, что в модели — должно совпадать)
- `grade_type`: homework, exam, quiz, project, participation (НЕ class/independent/control)
- `attendance_status`: present, absent, late, excused (НЕ on_time)
- `lesson_status`: scheduled, completed, cancelled (НЕ conducted/incomplete/in_progress)
- `payment_status`: paid, pending, overdue

### Поля моделей (частые ошибки)
- `user.role` — строка, НЕ enum. Никогда `.value`
- `LessonMaterialModel` — `created_at`/`updated_at`, НЕ `uploaded_at`. Есть `s3_key` для GCS
- `DiamondRecordModel` — `reason` + `awarded_at`, НЕ `note`
- `CompensationModelModel` — `teacher_id, type, rate`, НЕ `name, params`
- `SalaryCalculationModel` — `period_month, period_year, lessons_conducted`, НЕ `period_start`
- `grade_records` — есть и `lesson_id` (FK lessons) и `exam_id` (FK exams), `subject_id` nullable
- Группы — НЕТ `subject_id`, НЕТ `teacher_id`
- `ExamModel` — одна штука в models (была дублирована, вторая удалена)
- `PaymentModel` — `paid_amount` (сколько реально оплачено), `period_number` (номер в графике)
- `HomeworkAssignmentModel` — `file_urls` (JSONB, [{url, filename, key}]). НЕТ `type` поля
- `HomeworkSubmissionModel` — `file_url`, `s3_key`, `answer_text`. При submit всегда status=`submitted` (даже если просрочено)
- `AttendanceRecordModel` — НЕТ `created_at`, есть `recorded_at`
- `ShopItemModel` — `cost_stars`, `cost_crystals`, `stock` (null=unlimited)
- `StudentPurchaseModel` — `student_id`, `item_id`, `purchased_at`

### Геймификация (правила начисления)
- Посещение: +5⭐ present, -2⭐ late, 0 absent
- Оценка урока: +10⭐ (9-10), +5⭐ (7-8)
- Домашка вовремя: +15⭐
- Оценка домашки: +20⭐ (9-10), +10⭐ (7-8)
- Серия посещений: +5💎 (5 подряд), +15💎 (10 подряд)
- Преподаватель может вручную начислить 💎 через conduct
- Badge: Bronze(0) → Silver(100) → Gold(300) → Platinum(600) → Diamond(1000)

### GPA
- **10-балльная шкала**: `avg(score / max_score * 10)`
- Включает ВСЕ grade_records: participation + homework + exam + quiz + project

### Frontend ошибки которые были
- `lesson.group.name` → нет вложенного объекта, API возвращает flat `groupId` → резолвить через lookup map
- `student.enrollments?.length` → нет поля, использовать `student.groupCount`
- `data.attendance.map(r => r.student)` → нет вложенного student, использовать `groupStudents`
- `r.grade` → API возвращает `r.value`, `r.diamonds` → `r.amount`
- Student portal `Input` без `forwardRef` → react-hook-form не видит значения → валидация всегда failed
- `jspdf-autotable`: `autoTable(doc, opts)`, НЕ `doc.autoTable(opts)`
- PDF Cyrillic: нужны Roboto .ttf в `public/fonts/`, регистрировать и normal и bold

### CamelCase API
- Все новые endpoint'ы: `CamelModel(alias_generator=to_camel, populate_by_name=True)`
- Query params: `Query(alias="camelCase")`
- CRM contracts page использует `isActive`/`durationMonths`/`totalLessons` (camelCase от API)

## Миграция

Один файл `0001_initial.py`. При свежем деплое создаёт все таблицы. Изменения в текущей БД делаются через `ALTER TABLE` вручную (миграция обновляется для будущих деплоев).

## Тесты

292 юнит-теста: `cd backend && poetry run pytest tests/unit/ -v`

## Seed

**Основной seed**: `backend/scripts/seed_full.py` — комплексный seed с 200 студентами.

```bash
# Полная пересоздание данных (3 команды):
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed_full.py"
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/run_ml_scoring.py"
docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/recalc_gamification.py"
```

Seed создаёт: 200 студентов, 14 преподавателей, 30 групп, 730 уроков, 4272 attendance, 4538 grades, 256 ДЗ, 200 контрактов, 1200 платежей, CRM (30 лидов), геймификация (7 ачивок, 5 товаров).

### Текущие учётные данные (все пароли: `password123`)

| Роль | Email |
|------|-------|
| Директор | director@edu.uz |
| МУП | mup@edu.uz |
| Кассир | cashier@edu.uz |
| Менеджер продаж | sales@edu.uz |
| Преподаватель (Python) | t.python1@edu.uz |
| Преподаватель (JS) | t.js1@edu.uz |
| Студент | student1@edu.uz ... student200@edu.uz |

### MupTaskModel — расширенные поля
- `status` (pending/in_progress/done/overdue), `priority` (low/medium/high)
- `student_id` (FK students), `category` (absence_streak/payment_overdue/high_risk)

### Контроль доступа (платформенные гварды)
- LMS: `lms_platform_guard` → director, mup, teacher, cashier
- CRM: `crm_platform_guard` → director, sales_manager
- Student: `student_platform_guard` → student
- Настроены на уровне роутера через `dependencies=[Depends(guard)]`
