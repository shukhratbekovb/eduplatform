# Student Portal — План разработки

**Стек:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zustand · React Query · Demo Adapter  
**Мультиязычность:** RU + EN (через `useT()`, идентично CRM)  
**Режим данных:** Demo adapter (axios interceptor), бэкенд подключается позже  

---

## 1. Структура проекта

```
student/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx            # Страница входа
│   │   ├── (portal)/
│   │   │   ├── layout.tsx                # Root layout: Sidebar + TopBar
│   │   │   ├── dashboard/page.tsx        # Главная
│   │   │   ├── homework/page.tsx         # Домашние задания
│   │   │   ├── performance/page.tsx      # Успеваемость
│   │   │   ├── schedule/page.tsx         # Расписание
│   │   │   ├── materials/page.tsx        # Учебные материалы
│   │   │   ├── achievements/page.tsx     # Награды
│   │   │   ├── shop/page.tsx             # Магазин (в разработке)
│   │   │   ├── payment/page.tsx          # Оплата
│   │   │   └── contacts/page.tsx         # Контакты
│   │   ├── globals.css
│   │   └── layout.tsx                    # HTML root
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx               # Левый сайдбар с навигацией
│   │   │   ├── TopBar.tsx                # Верхняя панель (звёзды, кристаллы, уведомления, аватар)
│   │   │   └── ProfileDropdown.tsx       # Выпадающее меню профиля
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx            # Карточки: задания, кристаллы, звёзды
│   │   │   ├── GradesWidget.tsx          # Средний балл по типам + линейный график
│   │   │   ├── GradesCalendar.tsx        # Календарь оценок (тепловая карта по дням)
│   │   │   ├── ActivityFeed.tsx          # Лента начислений (звёзды/кристаллы за действия)
│   │   │   ├── AttendanceWidget.tsx      # Посещаемость: % присутствия, пропуска, опоздания
│   │   │   └── Leaderboard.tsx           # Таблица лидеров (топ студентов)
│   │   │
│   │   ├── homework/
│   │   │   ├── HomeworkGrid.tsx          # Грид карточек заданий
│   │   │   ├── HomeworkCard.tsx          # Карточка задания (тип, предмет, дедлайн)
│   │   │   └── HomeworkDetailPanel.tsx   # Правая панель: описание, сдача, материалы, оценка
│   │   │
│   │   ├── performance/
│   │   │   ├── SubjectList.tsx           # Список предметов с текущим баллом
│   │   │   ├── PerformanceSummary.tsx    # Уровень, кол-во заданий, посещаемость
│   │   │   ├── PerformanceChart.tsx      # График среднего балла по месяцам
│   │   │   └── PerformanceCalendar.tsx   # Календарь оценок по выбранному предмету
│   │   │
│   │   ├── schedule/
│   │   │   ├── WeeklyCalendar.tsx        # Недельная сетка (пн–вс, почасовая)
│   │   │   └── LessonCard.tsx            # Карточка урока: предмет, время, группа
│   │   │
│   │   ├── materials/
│   │   │   ├── MaterialsFilters.tsx      # Поиск + фильтр предмет + фильтр язык
│   │   │   └── MaterialCard.tsx          # Карточка материала: название, тип, предмет
│   │   │
│   │   ├── achievements/
│   │   │   ├── BadgeGrid.tsx             # Сетка наград
│   │   │   └── BadgeCard.tsx             # Карточка награды: иконка, название, награда, статус
│   │   │
│   │   ├── payment/
│   │   │   ├── PaymentSchedule.tsx       # График платежей (будущие): таблица дата + сумма
│   │   │   └── PaymentHistory.tsx        # История платежей (прошлые)
│   │   │
│   │   ├── contacts/
│   │   │   └── ContactCard.tsx           # Карточка контакта: фото, имя, роль, email, телефон
│   │   │
│   │   └── ui/                           # Базовые UI компоненты (Button, Badge, Input и т.д.)
│   │
│   ├── lib/
│   │   ├── i18n/
│   │   │   ├── ru.ts                     # Русские строки
│   │   │   ├── en.ts                     # Английские строки
│   │   │   └── index.ts                  # useT() хук
│   │   │
│   │   ├── stores/
│   │   │   ├── useAuthStore.ts           # Студент: id, name, group, photo, stars, crystals
│   │   │   ├── usePortalStore.ts         # UI state: sidebarCollapsed, lang, theme
│   │   │   └── useI18nStore.ts           # Текущий язык (persist)
│   │   │
│   │   ├── api/
│   │   │   └── student/
│   │   │       ├── dashboard.ts
│   │   │       ├── homework.ts
│   │   │       ├── performance.ts
│   │   │       ├── schedule.ts
│   │   │       ├── materials.ts
│   │   │       ├── achievements.ts
│   │   │       ├── payment.ts
│   │   │       └── contacts.ts
│   │   │
│   │   ├── hooks/
│   │   │   └── student/
│   │   │       ├── useDashboard.ts
│   │   │       ├── useHomework.ts
│   │   │       ├── usePerformance.ts
│   │   │       ├── useSchedule.ts
│   │   │       ├── useMaterials.ts
│   │   │       ├── useAchievements.ts
│   │   │       ├── usePayment.ts
│   │   │       └── useContacts.ts
│   │   │
│   │   ├── demo/
│   │   │   ├── data.ts                   # Все mock данные
│   │   │   └── adapter.ts                # Axios interceptor
│   │   │
│   │   └── utils/
│   │       ├── cn.ts
│   │       └── dates.ts
│   │
│   └── types/
│       └── student/
│           └── index.ts                  # Все TypeScript типы
│
├── public/
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 2. Страницы и функциональность

### 2.1 Login (`/login`)
- Email + пароль
- Кнопка "Войти в демо" (без регистрации)
- Переключатель языка

### 2.2 Dashboard (`/dashboard`) — Главная
**Левая колонка:**
- `StatsCards` — 2 карточки: задания к выполнению + выполнено вовремя
- `GradesWidget` — средний балл (классная, самостоятельная, контрольная, тематическая) + линейный график по месяцам
- `GradesCalendar` — тепловая карта оценок: каждый день = клетка с баллом

**Центральная колонка:**
- `ActivityFeed` — лента событий: "+3 звезды за сдачу задания", "Посещение занятия", "Ответ преподавателя" с иконками и датами
- `AttendanceWidget` — за 30 дней: % присутствие / пропуск / опоздание + мини-календарь посещаемости

**Правая колонка:**
- `Leaderboard` — топ-7 студентов группы/всего курса. Переключатель: 30 дней / весь период. Выделяет текущего студента.

### 2.3 Homework (`/homework`) — Домашние задания
**Табы:** К выполнению · На проверке · Выполнены  
**Фильтры:** Тип задания · Предмет · Статус  
**Счётчик:** Всего задач N

**Карточка задания:**
- Цветной кружок с инициалами/иконкой типа
- Тип задания (Самостоятельная / Классная / Контрольная / Тематическая)
- Название предмета
- Дата + статус (просрочено / осталось N дней / сдано)
- Оценка (если выполнено)

**Панель детали (правая, слайд-ин):**
- Дата занятия + предмет + преподаватель
- Описание задания
- Кнопка "Открыть задание" (ссылка)
- Дедлайн с обратным отсчётом дней
- Секция сдачи: загрузка файла + текстовое поле
- Раздел "Материалы по теме"
- Раздел "Дополнительные материалы"
- Если проверено: отображение файла студента + оценка + комментарий преподавателя

### 2.4 Performance (`/performance`) — Успеваемость
**Левая панель:** список предметов с текущим средним баллом

**Правая часть (при выборе предмета):**
- Уровень: Высокий / Средний / Низкий (+ описание уровня)
- Карточки: задания к выполнению + просроченные
- Посещаемость: % присутствие / пропуск / опоздание + мини-календарь
- `PerformanceChart` — линейный график среднего балла по месяцам (классная, самостоятельная)
- `PerformanceCalendar` — помесячный календарь оценок

### 2.5 Schedule (`/schedule`) — Расписание
- Навигация по неделям (< апрель 2026 >)
- Сетка: 7 колонок (пн-вс) × временные слоты (08:00–22:00)
- Текущий день выделен
- `LessonCard` в ячейке: название предмета, время (19:00–20:30), группа (№ 701)
- Кнопка "Расписание экзаменов" (открывает отдельный список/модал)

### 2.6 Materials (`/materials`) — Учебные материалы
- Поиск по названию
- Фильтр: Предмет
- Фильтр: Язык материала (RU / EN / UZ)
- Грид карточек (или пустое состояние "Нет данных")
- Карточка материала: тип (видео / PDF / статья), название, предмет, язык, кнопка скачать/открыть

### 2.7 Achievements (`/achievements`) — Награды
- Заголовок "Награды"
- Сетка бейджей (4 в ряд)
- `BadgeCard`: иллюстрация, название, описание при наведении, награда (N ⭐ + N 💎), статус (получен / заблокирован — серый)
- Категории бейджей:
  - Активность (Отзывы, Бейдж месяца)
  - Посещаемость (5/10/20 занятий без пропусков, без опоздания)
  - Достижения (Первое задание, Отличник)

### 2.8 Shop (`/shop`) — Магазин
- Полноэкранная заглушка "В разработке"
- Иллюстрация + текст + баланс звёзд/кристаллов студента

### 2.9 Payment (`/payment`) — Оплата
**Два таба:**

**График платежей** (будущие):
| Назначение | Дата | Сумма |
|---|---|---|
| Оплата за обучение | 01 Июня 2026 | 500 000 сум |

**История платежей** (прошлые):
| Назначение | Дата | Сумма |
|---|---|---|
| Оплата за обучение | 22 Апреля 2025 | 1 530 000 сум |

Если все оплачено — красивая заглушка "Все платежи внесены".

### 2.10 Contacts (`/contacts`) — Контакты
- Список контактов центра: кураторы, менеджеры, техподдержка
- `ContactCard`: аватар, ФИО, роль, email, телефон (кликабельный), Telegram (опционально)

---

## 3. TypeScript типы

```typescript
// Студент
interface Student {
  id: string
  fullName: string
  photo: string | null
  studentCode: string       // SEP-24211
  groupId: string
  groupName: string
  stars: number
  crystals: number
  email: string
  phone: string
  dateOfBirth: string
}

// Задание
interface Assignment {
  id: string
  title: string
  type: 'class' | 'independent' | 'control' | 'thematic' | 'homework'
  subjectId: string
  subjectName: string
  teacherName: string
  description: string
  lessonDate: string
  deadline: string
  status: 'pending' | 'submitted' | 'reviewed' | 'overdue'
  grade: number | null
  teacherComment: string | null
  submittedFileUrl: string | null
  materialsCount: number
}

// Оценка
interface Grade {
  date: string
  subjectId: string
  type: 'class' | 'independent' | 'control' | 'thematic'
  value: number
}

// Посещаемость
interface AttendanceRecord {
  date: string
  subjectId: string
  status: 'present' | 'absent' | 'late'
}

// Урок в расписании
interface Lesson {
  id: string
  subjectName: string
  subjectId: string
  teacherName: string
  startTime: string     // "19:00"
  endTime: string       // "20:30"
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  weekDate: string      // ISO date of that specific day
  groupNumber: string   // "701"
  room: string | null
  isOnline: boolean
}

// Учебный материал
interface Material {
  id: string
  title: string
  subjectId: string
  subjectName: string
  type: 'pdf' | 'video' | 'article' | 'presentation'
  language: 'ru' | 'en' | 'uz'
  url: string
  uploadedAt: string
}

// Награда / Бейдж
interface Achievement {
  id: string
  title: string
  description: string
  category: 'activity' | 'attendance' | 'academic'
  illustrationUrl: string
  starsReward: number
  crystalsReward: number
  isUnlocked: boolean
  unlockedAt: string | null
}

// Событие в ленте активности
interface ActivityEvent {
  id: string
  date: string
  type: 'stars_earned' | 'crystals_earned' | 'homework_graded' | 'attendance' | 'teacher_reply'
  description: string
  starsAmount: number | null
  crystalsAmount: number | null
  subjectName: string | null
}

// Студент в таблице лидеров
interface LeaderboardEntry {
  rank: number
  studentId: string
  fullName: string
  photo: string | null
  points: number
  isCurrentUser: boolean
}

// Платёж
interface Payment {
  id: string
  description: string
  date: string
  amount: number
  currency: string       // "UZS"
  isPaid: boolean
}

// Контакт
interface Contact {
  id: string
  fullName: string
  role: 'curator' | 'manager' | 'support' | 'teacher'
  photo: string | null
  email: string
  phone: string
  telegram: string | null
}

// Предмет
interface Subject {
  id: string
  name: string
  teacherName: string
  currentAvgGrade: number
}

// Итог по предмету (для страницы успеваемости)
interface SubjectPerformance {
  subject: Subject
  level: 'high' | 'medium' | 'low'
  levelDescription: string
  pendingTasks: number
  overdueTasks: number
  attendance: {
    presentPercent: number
    absentPercent: number
    latePercent: number
  }
  grades: Grade[]
}

// Дашборд
interface DashboardData {
  pendingAssignments: number
  onTimeAssignments: number
  totalAssignments: number
  avgGrades: {
    class: number
    independent: number
    control: number
    thematic: number
  }
  attendance30d: {
    presentPercent: number
    absentPercent: number
    latePercent: number
  }
  recentGrades: Grade[]
  activityFeed: ActivityEvent[]
  leaderboard: LeaderboardEntry[]
}
```

---

## 4. Геймификация — логика начисления

| Событие | Звёзды | Кристаллы |
|---|---|---|
| Сдача задания вовремя | +2 | — |
| Оценка 12 (макс) | +3 | +1 |
| Посещение занятия | +1 | — |
| 5 занятий без пропусков | — | +2 |
| 10 занятий без пропусков | — | +5 |
| Оценка преподавателя "отлично" | +1 | — |

Таблица лидеров = суммарные звёзды за период (30 дней / всё время).

---

## 5. Demo данные

**Файл `demo/data.ts` содержит:**
- `DEMO_STUDENT` — один студент (текущий пользователь)
- `DEMO_SUBJECTS` — 3–4 предмета
- `DEMO_ASSIGNMENTS` — ~20 заданий (смесь статусов)
- `DEMO_GRADES` — оценки за 3 месяца
- `DEMO_ATTENDANCE` — посещаемость за 30 дней
- `DEMO_SCHEDULE` — 2 недели расписания (по 2–3 урока в день)
- `DEMO_MATERIALS` — 6–8 материалов
- `DEMO_ACHIEVEMENTS` — 12 бейджей (5 получены, 7 заблокированы)
- `DEMO_PAYMENTS` — 3 будущих + 5 прошлых платежей
- `DEMO_CONTACTS` — 4–5 контактов
- `DEMO_ACTIVITY` — 15 событий в ленте
- `DEMO_LEADERBOARD` — топ-7 студентов

**Demo adapter** (`demo/adapter.ts`) обрабатывает:
- `GET /student/dashboard`
- `GET /student/assignments?status=pending|submitted|reviewed`
- `POST /student/assignments/:id/submit` (мутирует состояние в памяти)
- `GET /student/performance`
- `GET /student/schedule?weekStart=YYYY-MM-DD`
- `GET /student/materials`
- `GET /student/achievements`
- `GET /student/payments`
- `GET /student/contacts`
- `POST /auth/login` → возвращает DEMO_STUDENT + token
- `GET /student/leaderboard?period=30d|all`

---

## 6. i18n ключи (структура)

```
nav.*           — пункты навигации
login.*         — страница входа
dashboard.*     — главная
homework.*      — домашние задания
assignment.type.*  — типы заданий
assignment.status.* — статусы
performance.*   — успеваемость
performance.level.* — уровни (high/medium/low)
schedule.*      — расписание
materials.*     — учебные материалы
achievements.*  — награды
shop.*          — магазин
payment.*       — оплата
contacts.*      — контакты
profile.*       — профиль
common.*        — общие (сохранить, отмена, загрузка и т.д.)
```

---

## 7. Дизайн-система

| Параметр | Значение |
|---|---|
| Цвет акцента | `#6366F1` (indigo) — как в референсе "MyStat" |
| Фон сайдбара | `#1A1A2E` (тёмно-синий) |
| Шрифт | Inter |
| Скруглени | `rounded-xl` (12px) |
| Тень карточек | `shadow-sm` + `border border-gray-200` |
| Тёмная тема | поддержка через `dark:` классы (переключатель в профиле) |

**Gamification цвета:**
- Звёзды ⭐ — `#F59E0B` (amber)
- Кристаллы 💎 — `#06B6D4` (cyan)

---

## 8. Порядок разработки (фазы)

### Фаза 1 — Основа (инфраструктура)
1. `next.config.ts`, `tailwind.config.ts`, зависимости (`package.json`)
2. Глобальные стили (`globals.css`), CSS переменные
3. UI компоненты: `Button`, `Badge`, `Input`, `Dialog`, `Skeleton`
4. `types/student/index.ts` — все типы
5. `lib/i18n/` — ru.ts + en.ts + useT()
6. `lib/stores/` — useAuthStore, usePortalStore, useI18nStore
7. `lib/demo/data.ts` — все mock данные
8. `lib/demo/adapter.ts` — axios interceptor
9. `lib/api/student/*.ts` — все API функции
10. `lib/hooks/student/*.ts` — все React Query хуки

### Фаза 2 — Шелл
11. `app/layout.tsx` — Providers (QueryClient, Theme)
12. `app/(auth)/login/page.tsx` — страница входа
13. `app/(portal)/layout.tsx` — Sidebar + TopBar
14. `components/layout/Sidebar.tsx` — навигация
15. `components/layout/TopBar.tsx` — звёзды, кристаллы, уведомления, аватар
16. `components/layout/ProfileDropdown.tsx` — меню профиля + панель профиля

### Фаза 3 — Главная страница
17. `components/dashboard/StatsCards.tsx`
18. `components/dashboard/GradesWidget.tsx` + линейный график (Recharts)
19. `components/dashboard/GradesCalendar.tsx`
20. `components/dashboard/ActivityFeed.tsx`
21. `components/dashboard/AttendanceWidget.tsx`
22. `components/dashboard/Leaderboard.tsx`
23. `app/(portal)/dashboard/page.tsx`

### Фаза 4 — Домашние задания
24. `components/homework/HomeworkCard.tsx`
25. `components/homework/HomeworkGrid.tsx`
26. `components/homework/HomeworkDetailPanel.tsx` (slide-in панель)
27. `app/(portal)/homework/page.tsx`

### Фаза 5 — Успеваемость
28. `components/performance/SubjectList.tsx`
29. `components/performance/PerformanceSummary.tsx`
30. `components/performance/PerformanceChart.tsx`
31. `components/performance/PerformanceCalendar.tsx`
32. `app/(portal)/performance/page.tsx`

### Фаза 6 — Расписание
33. `components/schedule/WeeklyCalendar.tsx`
34. `components/schedule/LessonCard.tsx`
35. `app/(portal)/schedule/page.tsx`

### Фаза 7 — Оставшиеся страницы
36. `app/(portal)/materials/page.tsx` + компоненты
37. `app/(portal)/achievements/page.tsx` + компоненты
38. `app/(portal)/payment/page.tsx` + компоненты
39. `app/(portal)/contacts/page.tsx` + компоненты
40. `app/(portal)/shop/page.tsx` — заглушка "В разработке"

---

## 9. Ключевые зависимости

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "tailwindcss": "3.x",
    "zustand": "4.x",
    "@tanstack/react-query": "5.x",
    "axios": "1.x",
    "recharts": "2.x",
    "lucide-react": "latest",
    "sonner": "1.x",
    "@radix-ui/react-tooltip": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-tabs": "latest",
    "react-hook-form": "7.x",
    "zod": "3.x",
    "date-fns": "3.x",
    "clsx": "2.x",
    "tailwind-merge": "2.x"
  }
}
```

---

## 10. Открытые вопросы (решить до реального бэкенда)

| # | Вопрос | Влияние |
|---|---|---|
| 1 | Система оценок: 1–12 или другая шкала? | GradesCalendar, PerformanceChart |
| 2 | Валюта в оплате: UZS / сум / другое? | PaymentSchedule |
| 3 | Каким образом материалы хранятся: S3 / Google Drive? | Materials открытие файлов |
| 4 | Язык интерфейса для студента по умолчанию: RU? | i18n дефолт |
| 5 | Уведомления: push (browser) или только in-app? | TopBar bell icon |
