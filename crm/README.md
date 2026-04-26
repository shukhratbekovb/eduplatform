# CRM — Управление продажами

Веб-приложение для отдела продаж: воронки, лиды, договоры, аналитика конверсий.

**Порт:** 3000 | **URL:** http://localhost:3000

## Роли

| Роль | Доступ |
|------|--------|
| Директор | Полный доступ + аналитика |
| Менеджер продаж | Лиды, задачи, договоры |

## Технологии

| Библиотека | Версия | Назначение |
|-----------|--------|-----------|
| Next.js | 14.2.29 | React-фреймворк (App Router) |
| React | ^18.3 | UI-библиотека |
| TypeScript | ^5.7 | Типизация |
| Tailwind CSS | ^3.4 | Утилитарные стили |
| Zustand | ^5.0 | State management (auth, theme, i18n) |
| TanStack React Query | ^5.62 | Серверное состояние |
| Axios | ^1.7 | HTTP-клиент |
| Radix UI | ^1-2 | Headless UI-компоненты |
| Lucide React | ^0.468 | Иконки |
| Recharts | ^2.14 | Графики аналитики (Sankey, Funnel) |
| date-fns | ^4.1 | Работа с датами |
| react-hook-form + zod | ^7.54 / ^3.24 | Формы |
| @dnd-kit | ^6.3 | Drag-and-drop для Kanban лидов |
| papaparse | ^5.4 | Импорт CSV (лиды) |
| sonner | ^1.7 | Toast-уведомления |

## Структура

```
crm/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx         Страница входа
│   │   ├── (crm)/
│   │   │   ├── layout.tsx             Layout с auth guard + sidebar
│   │   │   ├── page.tsx               Главная (редирект на leads)
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx           Kanban-доска лидов
│   │   │   │   └── [id]/page.tsx      Карточка лида
│   │   │   ├── contracts/
│   │   │   │   ├── page.tsx           Список договоров
│   │   │   │   └── [id]/page.tsx      Детали договора
│   │   │   ├── analytics/page.tsx     Аналитика (конверсия, Sankey)
│   │   │   ├── tasks/page.tsx         Задачи менеджеров
│   │   │   ├── contacts/page.tsx      Контактная база
│   │   │   ├── dashboard/page.tsx     Дашборд
│   │   │   └── settings/
│   │   │       ├── page.tsx           Настройки
│   │   │       ├── funnels/           Управление воронками
│   │   │       └── sources/           Источники лидов
│   │   └── layout.tsx                 Root layout
│   │
│   ├── components/crm/
│   │   ├── layout/                    CrmSidebar, CrmTopbar (profile, theme, lang)
│   │   ├── leads/                     LeadCard, LeadForm, CustomFieldInput
│   │   ├── analytics/                 PeriodPicker, charts
│   │   └── contracts/                 ContractForm
│   │
│   ├── lib/
│   │   ├── api/crm/                   API-клиенты (leads, funnels, contracts)
│   │   ├── hooks/crm/                 React Query хуки
│   │   ├── stores/                    auth, theme, i18n stores
│   │   └── i18n/                      Словари RU/EN
│   │
│   └── types/crm/                     TypeScript типы
│
├── package.json
├── Dockerfile
└── README.md                          (этот файл)
```

## Запуск

```bash
# Docker
docker compose up -d --build crm

# Dev (локально)
cd crm
npm install
npm run dev    # http://localhost:3000
```

## Функциональность

- **Воронки продаж** — настраиваемые этапы с drag-and-drop перемещением лидов
- **Лиды** — карточки с кастомными полями, историей активностей, комментариями
- **Договоры** — создание с автогенерацией студента и графика платежей
- **Аналитика** — конверсия воронки, Sankey-диаграмма, эффективность менеджеров
- **Тёмная тема** — переключатель light/dark mode
- **i18n** — полная поддержка RU/EN
