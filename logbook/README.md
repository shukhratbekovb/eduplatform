# Logbook (LMS) — Журнал преподавателя

Веб-приложение для управления учебным процессом: расписание, посещаемость, оценки, домашние задания, аналитика, отчёты.

**Порт:** 3001 | **URL:** http://localhost:3001

## Роли

| Роль | Доступ |
|------|--------|
| Директор | Полный доступ + финансы + настройки |
| МУП | Управление учебным процессом + задачи + аналитика |
| Преподаватель | Свои уроки, студенты, домашки, расписание |
| Кассир | Финансы + отчёты |

## Технологии

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| Next.js | 14.2.29 | React-фреймворк (App Router, SSR) |
| React | ^18.3 | UI-библиотека |
| TypeScript | ^5.7 | Типизация |
| Tailwind CSS | ^3.4 | Утилитарные CSS-стили |
| Zustand | ^5.0 | State management (auth, i18n, filters) |
| TanStack React Query | ^5.62 | Серверное состояние, кэширование, мутации |
| Axios | ^1.7 | HTTP-клиент для API |
| Radix UI | ^1-2 | Headless UI-компоненты (Dialog, Dropdown, Tabs, Popover) |
| Lucide React | ^0.468 | Иконки (200+ используемых) |
| Recharts | ^2.14 | Графики (Line, Bar, Pie) для аналитики |
| date-fns | ^4.1 | Форматирование и работа с датами |
| react-hook-form + zod | ^7.54 / ^3.24 | Формы с валидацией |
| @dnd-kit | ^6.3 | Drag-and-drop для Kanban-доски задач |
| jspdf + jspdf-autotable | ^4.2 / ^5.0 | PDF-генерация отчётов |
| sonner | ^1.7 | Toast-уведомления |

## Структура

```
logbook/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx         Страница входа
│   │   ├── (lms)/
│   │   │   ├── layout.tsx             Layout с auth guard
│   │   │   ├── dashboard/page.tsx     Дашборд (4 роли)
│   │   │   ├── schedule/page.tsx      Расписание (недельный календарь)
│   │   │   ├── attendance/page.tsx    Посещаемость
│   │   │   ├── students/
│   │   │   │   ├── page.tsx           Список студентов + risk filters
│   │   │   │   └── [id]/page.tsx      Профиль студента + ML risk
│   │   │   ├── groups/
│   │   │   │   ├── page.tsx           Список групп
│   │   │   │   └── [id]/page.tsx      Детали группы
│   │   │   ├── homework/page.tsx      Домашние задания
│   │   │   ├── lessons/[id]/page.tsx  Conduct урока
│   │   │   ├── analytics/page.tsx     Аналитика (5 графиков)
│   │   │   ├── reports/page.tsx       Отчёты (7 типов + PDF)
│   │   │   ├── finance/page.tsx       Платежи и график
│   │   │   ├── tasks/page.tsx         Kanban-доска задач МУП
│   │   │   ├── notifications/page.tsx Уведомления
│   │   │   ├── staff/
│   │   │   │   ├── page.tsx           Персонал
│   │   │   │   └── [id]/page.tsx      Профиль сотрудника
│   │   │   ├── exams/page.tsx         Экзамены
│   │   │   ├── settings/page.tsx      Настройки (направления, предметы, кабинеты)
│   │   │   ├── compensation/page.tsx  Компенсации преподавателям
│   │   │   ├── late-requests/page.tsx Запросы на позднее внесение
│   │   │   ├── materials/page.tsx     Материалы уроков
│   │   │   └── works/page.tsx         Работы студентов
│   │   └── layout.tsx                 Root layout
│   │
│   ├── components/
│   │   ├── lms/
│   │   │   ├── layout/               LmsSidebar, LmsTopbar (notifications, profile)
│   │   │   ├── students/             RiskBadge, StudentForm, TransferForm
│   │   │   ├── lessons/              AttendanceTable, GradeInput, DiamondDistributor
│   │   │   ├── schedule/             LessonCard, LessonForm, ScheduleColumn
│   │   │   ├── groups/               GroupForm
│   │   │   └── tasks/                TaskCard, TaskColumn
│   │   ├── shared/                   EmptyState, ConfirmDialog, Providers
│   │   └── ui/                       Button, Input, Dialog, DatePicker, Tabs, Badge
│   │
│   ├── lib/
│   │   ├── api/lms/                  API-клиенты (students, analytics, homework...)
│   │   ├── hooks/lms/                React Query хуки
│   │   ├── stores/                   Zustand stores (auth, i18n, lms)
│   │   ├── i18n/                     Словари RU/EN (~500 ключей)
│   │   └── utils/                    cn, dates, formatters
│   │
│   └── types/lms/                    TypeScript типы (entities, filters)
│
├── public/fonts/                     Roboto Regular + Bold (для PDF)
├── package.json
├── Dockerfile
├── tailwind.config.ts
└── README.md                         (этот файл)
```

## Запуск

```bash
# Docker
docker compose up -d --build logbook

# Dev (локально)
cd logbook
npm install
npm run dev    # http://localhost:3001
```

## i18n (Мультиязычность)

Переключатель RU/EN в topbar. Язык сохраняется в localStorage.

- Словари: `src/lib/i18n/ru.ts`, `src/lib/i18n/en.ts`
- Hook: `useT()` → `t('key')`
- Покрытие: все 19 страниц + все компоненты + toast-сообщения
