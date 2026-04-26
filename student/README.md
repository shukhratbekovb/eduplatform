# Student Portal — Личный кабинет студента

Веб-приложение для студентов: расписание, оценки, домашние задания, геймификация, магазин наград.

**Порт:** 3002 | **URL:** http://localhost:3002

## Роли

Доступ только для пользователей с ролью **student**.

## Технологии

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| Next.js | 14.2.35 | React-фреймворк (App Router) |
| React | ^18 | UI-библиотека |
| TypeScript | ^5 | Типизация |
| Tailwind CSS | ^3.4 | Утилитарные стили |
| Zustand | ^5.0 | State management (auth, i18n, portal) |
| TanStack React Query | ^5.97 | Серверное состояние |
| Axios | ^1.15 | HTTP-клиент |
| Radix UI | ^1-2 | Dialog, DropdownMenu, Tabs, Tooltip, Progress |
| Lucide React | ^0.468 | Иконки |
| Recharts | ^2.15 | Графики успеваемости |
| date-fns | ^4.1 | Работа с датами |
| react-hook-form + zod | ^7.72 / ^3.25 | Формы (логин) |
| sonner | ^1.7 | Toast-уведомления |

## Структура

```
student/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx         Страница входа
│   │   ├── (portal)/
│   │   │   ├── layout.tsx             Layout с auth guard + sidebar
│   │   │   ├── dashboard/page.tsx     Дашборд (7 виджетов)
│   │   │   ├── schedule/page.tsx      Расписание (недельный календарь)
│   │   │   ├── homework/page.tsx      Домашние задания (сдача + файлы)
│   │   │   ├── performance/page.tsx   Успеваемость (оценки по предметам)
│   │   │   ├── materials/page.tsx     Материалы уроков (скачивание)
│   │   │   ├── achievements/page.tsx  Достижения (unlocked/locked)
│   │   │   ├── shop/page.tsx          Магазин наград
│   │   │   ├── payment/page.tsx       Платежи (3 вкладки)
│   │   │   └── contacts/page.tsx      Контакты учебного центра
│   │   ├── page.tsx                   Публичная landing-страница
│   │   └── layout.tsx                 Root layout
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx         GPA, посещаемость, задания
│   │   │   ├── GradesWidget.tsx       Последние оценки
│   │   │   ├── AttendanceWidget.tsx   Pie-chart посещаемости
│   │   │   ├── TodaySchedule.tsx      Расписание на сегодня
│   │   │   ├── UpcomingDeadlines.tsx   Ближайшие дедлайны
│   │   │   ├── ActivityFeed.tsx       Лента начислений звёзд/кристаллов
│   │   │   └── Leaderboard.tsx        Рейтинг по звёздам
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx            Боковая навигация
│   │   │   ├── TopBar.tsx             Верхняя панель (звёзды, кристаллы)
│   │   │   └── ProfileDropdown.tsx    Профиль + смена пароля
│   │   └── ui/                        Переиспользуемые UI-компоненты
│   │
│   ├── lib/
│   │   ├── api/                       API-клиенты (axios instance)
│   │   ├── stores/                    auth, i18n, portal stores
│   │   ├── i18n/                      Словари RU/EN (~300 ключей)
│   │   └── utils/                     cn, dates
│   │
│   └── types/                         TypeScript типы
│
├── package.json
├── Dockerfile
└── README.md                          (этот файл)
```

## Запуск

```bash
# Docker
docker compose up -d --build student

# Dev (локально)
cd student
npm install
npm run dev    # http://localhost:3002
```

## Виджеты дашборда

1. **StatsCards** — GPA, посещаемость %, задания к выполнению, выполнено вовремя
2. **GradesWidget** — последние оценки с типом (Урок / ДЗ / Экзамен)
3. **AttendanceWidget** — pie-chart (present / absent / late %)
4. **TodaySchedule** — расписание на сегодня с подсветкой текущего урока
5. **UpcomingDeadlines** — ближайшие дедлайны (overdue / urgent / обратный отсчёт)
6. **ActivityFeed** — лента начислений звёзд и кристаллов
7. **Leaderboard** — рейтинг по звёздам в группе

## Геймификация

- **TopBar** — звёзды + кристаллы (live из dashboard API)
- **Achievements** — каталог ачивок (цветные unlocked + серые locked)
- **Shop** — товары с ценами, баланс, кнопка "Купить"
- **Badge** — уровень (Bronze → Diamond) в профиле

## i18n

Переключатель RU/EN в меню профиля. Язык сохраняется в localStorage.
