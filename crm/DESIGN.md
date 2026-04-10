# CRM Module — Design Plan
## EduPlatform

**Version:** 1.0
**Date:** 2026-03-25
**Based on:** PRD v1.2 + DEVELOPMENT_PLAN.md
**Roles covered:** Director, Sales Manager (МПП)

---

## Table of Contents

1. [Design System](#1-design-system)
   - 1.1 Color Palette
   - 1.2 Typography
   - 1.3 Spacing & Grid
   - 1.4 Shadows & Elevation
   - 1.5 Border Radius
   - 1.6 Semantic Tokens
2. [Information Architecture](#2-information-architecture)
3. [Navigation Model](#3-navigation-model)
4. [Screens](#4-screens)
5. [User Flows](#5-user-flows)
6. [Role-Based UI](#6-role-based-ui)
7. [UX Logic Considerations](#7-ux-logic-considerations)
8. [Component States](#8-component-states)

---

## 1. Design System

### 1.1 Color Palette

#### Brand / Primary — Indigo
Основной акцент: кнопки, ссылки, активные состояния, выделения.

| Token | Hex | Применение |
|---|---|---|
| `primary-50` | `#EEF2FF` | Фон выбранного элемента, hover на sidebar |
| `primary-100` | `#E0E7FF` | Фон бейджей, подсветка |
| `primary-500` | `#6366F1` | Вторичные акценты |
| `primary-600` | `#4F46E5` | Основной цвет бренда (кнопки, ссылки) |
| `primary-700` | `#4338CA` | Hover состояние кнопок |
| `primary-800` | `#3730A3` | Active / нажатое состояние |

#### Нейтральные (Gray)
Тексты, фоны, границы — основа интерфейса.

| Token | Hex | Применение |
|---|---|---|
| `gray-50` | `#F9FAFB` | Фон страницы |
| `gray-100` | `#F3F4F6` | Фон карточек, hover строк таблицы |
| `gray-200` | `#E5E7EB` | Границы, разделители |
| `gray-300` | `#D1D5DB` | Плейсхолдер границы инпутов |
| `gray-400` | `#9CA3AF` | Иконки неактивные, плейсхолдер текст |
| `gray-500` | `#6B7280` | Вторичный текст (meta, даты, подписи) |
| `gray-700` | `#374151` | Основной текст (параграфы) |
| `gray-900` | `#111827` | Заголовки, важный текст |

#### Sidebar
Темный sidebar для четкого разделения навигации и контента.

| Token | Hex | Применение |
|---|---|---|
| `sidebar-bg` | `#1E1B4B` | Фон сайдбара |
| `sidebar-hover` | `#2D2A6E` | Hover на элементе навигации |
| `sidebar-active` | `#312E81` | Активный элемент навигации |
| `sidebar-text` | `#C7D2FE` | Текст навигации (primary-200) |
| `sidebar-text-active` | `#FFFFFF` | Активный текст навигации |
| `sidebar-icon` | `#818CF8` | Иконки навигации (primary-400) |

#### Семантические цвета (Semantic)

**Success — Зеленый (Won, оплачено, завершено)**
| Token | Hex |
|---|---|
| `success-50` | `#ECFDF5` |
| `success-500` | `#10B981` |
| `success-700` | `#047857` |

**Warning — Янтарный (At Risk, Medium priority, приближается дедлайн)**
| Token | Hex |
|---|---|
| `warning-50` | `#FFFBEB` |
| `warning-500` | `#F59E0B` |
| `warning-700` | `#B45309` |

**Danger — Красный (Lost, Overdue, Critical priority, ошибки)**
| Token | Hex |
|---|---|
| `danger-50` | `#FEF2F2` |
| `danger-500` | `#EF4444` |
| `danger-700` | `#B91C1C` |

**Info — Синий (Active lead, In Progress, Low priority)**
| Token | Hex |
|---|---|
| `info-50` | `#EFF6FF` |
| `info-500` | `#3B82F6` |
| `info-700` | `#1D4ED8` |

#### Приоритеты задач (Priority Badges)
| Приоритет | Цвет фона | Цвет текста | Hex фона | Hex текста |
|---|---|---|---|---|
| Low | Gray | Gray 700 | `#F3F4F6` | `#374151` |
| Medium | Info 50 | Info 700 | `#EFF6FF` | `#1D4ED8` |
| High | Orange 50 | Orange 700 | `#FFF7ED` | `#C2410C` |
| Critical | Danger 50 | Danger 700 | `#FEF2F2` | `#B91C1C` |

#### Статусы лида (Lead Status)
| Статус | Цвет | Hex |
|---|---|---|
| Active | Info 500 | `#3B82F6` |
| Won | Success 500 | `#10B981` |
| Lost | Danger 500 | `#EF4444` |

---

### 1.2 Typography

**Шрифт:** `Inter` (Google Fonts)
- Лицензия: Open Font License
- Подключение: `next/font/google` (автооптимизация в Next.js)
- Fallback: `system-ui, -apple-system, sans-serif`

#### Размерная шкала

| Token | Size | Line Height | Weight | Применение |
|---|---|---|---|---|
| `text-xs` | 12px | 16px | 400 | Метки, временные метки, бейджи |
| `text-sm` | 14px | 20px | 400/500 | Тело таблиц, вторичный текст, подписи |
| `text-base` | 16px | 24px | 400 | Основной текст, описания |
| `text-lg` | 18px | 28px | 500/600 | Заголовки секций |
| `text-xl` | 20px | 28px | 600 | Заголовки страниц (h2) |
| `text-2xl` | 24px | 32px | 700 | Главный заголовок страницы (h1) |
| `text-3xl` | 30px | 36px | 700 | Крупные цифры в дашборде |

#### Веса шрифта (Font Weights)
| Token | Value | Применение |
|---|---|---|
| `font-normal` | 400 | Обычный текст |
| `font-medium` | 500 | Лейблы, навигация, кнопки secondary |
| `font-semibold` | 600 | Заголовки карточек, кнопки primary |
| `font-bold` | 700 | Заголовки страниц, цифры метрик |

#### Специальные текстовые стили

```
Page Title:        text-2xl / font-bold / gray-900
Section Heading:   text-lg / font-semibold / gray-900
Card Title:        text-base / font-semibold / gray-900
Body Text:         text-sm / font-normal / gray-700
Secondary Text:    text-sm / font-normal / gray-500
Caption / Meta:    text-xs / font-normal / gray-400
Link:              text-sm / font-medium / primary-600 + hover:primary-700
Metric Number:     text-3xl / font-bold / gray-900
```

---

### 1.3 Spacing & Grid

**Базовая единица:** 4px

#### Шкала отступов
| Token | Value | Применение |
|---|---|---|
| `space-1` | 4px | Между иконкой и текстом |
| `space-2` | 8px | Padding мелких бейджей |
| `space-3` | 12px | Padding small кнопок |
| `space-4` | 16px | Padding стандартных кнопок, карточек |
| `space-5` | 20px | Gap между элементами в форме |
| `space-6` | 24px | Padding карточек, gap колонок |
| `space-8` | 32px | Отступ между секциями |
| `space-10` | 40px | Padding страницы (top) |
| `space-12` | 48px | Высота topbar |
| `space-16` | 64px | Высота topbar / ширина collapsed sidebar |

#### Размеры компонентов
| Компонент | Размер |
|---|---|
| Sidebar (expanded) | 240px |
| Sidebar (collapsed) | 64px |
| Topbar height | 64px |
| Lead drawer width | 560px |
| Modal width (small) | 400px |
| Modal width (medium) | 560px |
| Modal width (large) | 720px |
| Kanban card width | 280px |
| Kanban column width | 304px (card + 24px padding) |
| Button height (sm) | 32px |
| Button height (md) | 40px |
| Button height (lg) | 48px |
| Input height | 40px |
| Avatar (sm) | 24px |
| Avatar (md) | 32px |
| Avatar (lg) | 40px |

---

### 1.4 Shadows & Elevation

| Token | CSS Value | Применение |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Инпуты, неинтерактивные карточки |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)` | Kanban карточки |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -1px rgba(0,0,0,0.06)` | Dropdown меню, popover |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)` | Модальные окна |
| `shadow-drawer` | `-4px 0 24px rgba(0,0,0,0.12)` | Lead drawer (справа) |
| `shadow-drag` | `0 8px 32px rgba(0,0,0,0.18)` | Элемент при перетаскивании (DnD) |

---

### 1.5 Border Radius

| Token | Value | Применение |
|---|---|---|
| `rounded-sm` | 4px | Бейджи, мелкие теги |
| `rounded` | 6px | Кнопки, инпуты, чекбоксы |
| `rounded-md` | 8px | Kanban карточки, dropdowns |
| `rounded-lg` | 12px | Модальные окна, крупные карточки |
| `rounded-xl` | 16px | Drawer панель |
| `rounded-full` | 9999px | Аватары, круглые бейджи |

---

### 1.6 Семантические токены (Semantic Tokens)

Tailwind CSS custom tokens в `tailwind.config.ts`:

```ts
colors: {
  brand: {
    DEFAULT: '#4F46E5',
    hover: '#4338CA',
    active: '#3730A3',
    light: '#EEF2FF',
  },
  sidebar: {
    bg: '#1E1B4B',
    hover: '#2D2A6E',
    active: '#312E81',
    text: '#C7D2FE',
    'text-active': '#FFFFFF',
    icon: '#818CF8',
  }
}
```

---

## 2. Information Architecture

```
CRM Portal
├── /login                          — Вход в систему
│
└── /crm/                           — CRM Shell (sidebar + topbar)
    ├── /crm/leads                  — Список лидов (Kanban / List)
    │   └── /crm/leads/:id          — Детальная страница лида
    │
    ├── /crm/tasks                  — Задачи (Kanban / Calendar)
    │
    ├── /crm/analytics              — Аналитика
    │
    └── /crm/settings/              — Настройки (только Director)
        ├── /crm/settings/funnels   — Список воронок
        │   └── /crm/settings/funnels/:id  — Воронка (этапы + кастомные поля)
        └── /crm/settings/sources   — Источники лидов
```

### Секции и их назначение

| Секция | Назначение | Доступ |
|---|---|---|
| Leads | Основная рабочая область — управление лидами по воронкам | Director, Sales Manager |
| Tasks | Личная доска задач + контроль по менеджерам | Director (все), Sales Manager (свои) |
| Analytics | Дашборд с метриками CRM за период | Director (все), Sales Manager (свои) |
| Settings | Конфигурация воронок, этапов, источников | Director only |

---

## 3. Navigation Model

**Тип:** Hybrid (Sidebar + Topbar)

### Sidebar (левая панель, постоянная)

```
[Logo + "EduPlatform"]
─────────────────────
[Leads icon]     Лиды
[Tasks icon]     Задачи
[Analytics icon] Аналитика
─────────────────────
[Settings icon]  Настройки   ← только Director
─────────────────────
[collapse button]
```

- Ширина: 240px (expanded) / 64px (collapsed — только иконки + tooltip)
- Активный элемент: левая полоска `primary-600` + фон `sidebar-active`
- Collapse toggle: кнопка-стрелка в нижней части sidebar
- На mobile: drawer-режим (overlay поверх контента)

### Topbar (верхняя панель, постоянная)

```
[Breadcrumb / Page Title]          [Search] [Notifications Bell] [User Avatar + Name ▼]
```

- Высота: 64px
- Фон: белый (`#FFFFFF`), нижняя граница `gray-200`
- **Search** (глобальный): поиск по студентам, лидам, учителям, группам
- **Notifications Bell**: badge с количеством непрочитанных, dropdown список
- **User Menu**: аватар + имя → dropdown (Профиль / Выйти)

### Context Switching Logic

- Переключение между CRM / LMS / Finance — через logo dropdown или отдельную страницу выбора портала (если у пользователя несколько доступов)
- Director видит все порталы; Sales Manager видит только CRM
- При переходе в другой портал — полный reload layout

---

## 4. Screens

---

### Screen 1 — Login

**Route:** `/login`
**Type:** form

**Layout:**
```
[Полноэкранный фон: gray-50]
  [Центрированная карточка: 400px, белая, shadow-lg, rounded-lg]
    [Логотип + "EduPlatform"]
    [Заголовок: "Войти в систему"]
    [Email input]
    [Password input + показать/скрыть]
    [Button primary: "Войти"]
    [Error alert: красный banner при неверных данных]
```

**States:**
- Default / Loading (кнопка: spinner + disabled) / Error (banner сверху формы)

---

### Screen 2 — Leads: Kanban View

**Route:** `/crm/leads` (default)
**Type:** dashboard

**Layout:**
```
[Page Header]
  Title: "Лиды"
  Left: Funnel Selector dropdown
  Right: [Import CSV button] [+ Добавить лид button] [Kanban/List toggle]

[Filters Bar] (collapsible, серый фон)
  [Search input] [Stage multi-select] [Source filter] [Manager filter] [Status filter] [Date range] [Clear filters]
  Active filter count badge on filter icon

[Kanban Board] (horizontal scroll)
  [Column: Stage 1]  [Column: Stage 2]  [Column: Stage 3]  ...  [+ Добавить этап]
```

**Kanban Column:**
```
[Stage Name] [lead count badge]    [+ Add lead]
─────────────────────────────────
[LeadCard]
[LeadCard]
[LeadCard]
...
```

**Lead Card (280px):**
```
[Status dot] [Full Name]              [⋮ menu]
[Phone number]
[Source badge]
─────────────────
[Manager avatar] [Manager name]   [Last activity: "2 дня назад"]
```

**Data displayed:** name, phone, source, assigned manager, last activity date, status
**Actions:** drag to reorder stage, click → open drawer, Add lead per column, Mark Won/Lost via ⋮ menu

---

### Screen 3 — Leads: List View

**Route:** `/crm/leads?view=list`
**Type:** dashboard

**Layout:**
```
[Page Header — same as Kanban]
[Filters Bar — same as Kanban]

[Data Table]
  Columns: # | ФИО | Телефон | Источник | Этап | Менеджер | Последняя активность | Статус | Создан
  Sortable: ФИО, Создан, Последняя активность
  Row hover: gray-100 background
  Row click → Lead Detail page
  Pagination: 25/50/100 per page
```

**Bulk actions bar** (появляется при выборе чекбоксов):
```
[X выбрано] [Назначить менеджера ▼] [Изменить этап ▼] [Удалить]
```

---

### Screen 4 — Lead Detail

**Режим A — Drawer** (из Kanban, 560px, slide from right):
```
[Overlay: dark 40% opacity]
[Drawer: 560px, белый, shadow-drawer, rounded-xl left corners]
  [Header: Name + Status badge + Stage selector + [Won] [Lost] [Edit] [✕]]
  [Tabs: Info | Timeline | Tasks]
  [Tab Content]
```

**Режим B — Full Page** (при прямом переходе `/crm/leads/:id`):
```
[Breadcrumb: Лиды > Имя лида]
[Two-column layout: 65% content | 35% sidebar]
  Left: Tabs (Info / Timeline / Tasks)
  Right: Meta (stage, manager, source, created date, quick actions)
```

**Tab — Info:**
```
[Contact section: name, phone, email (edit inline)]
[Lead section: source, funnel, stage, manager]
[Custom Fields section: per-funnel fields]
[Danger Zone: Archive / Delete (Director only)]
```

**Tab — Timeline:**
```
[Log Activity button]
[Add Comment box (textarea + Submit)]
─────────────────────────────────
[Date group: "Сегодня"]
  [Activity item: call icon | "Звонок" | Исход: Перезвонить | 12:30 | Иванов]
  [Stage change: arrow icon | "Moved: Новый → Квалифицирован" | Иванов]
  [Comment: avatar | "Клиент заинтересован" | [Edit] [Delete]]
[Date group: "Вчера"]
  ...
```

**Tab — Tasks:**
```
[+ Создать задачу]
[Task item: checkbox | Title | Due date (red if overdue) | Priority badge | Assignee avatar]
...
```

---

### Screen 5 — Tasks: Kanban View

**Route:** `/crm/tasks`
**Type:** dashboard

**Layout:**
```
[Page Header]
  Title: "Задачи"
  Right: [Director: "Все менеджеры" toggle + manager filter] [Kanban/Calendar toggle] [+ Создать задачу]

[4 Columns]
  [Pending]    [In Progress]    [Done]    [Overdue]
```

**Task Card:**
```
[Priority bar: left border color by priority]
[Title]
[Linked lead: link icon + Lead Name (clickable)]
[Due date] [Assignee avatar]
```

**Overdue column:**
- Красный заголовок (`danger-500`)
- Карточки не перетаскиваются из этой колонки
- CTA: "Решить" → открывает task detail

---

### Screen 6 — Tasks: Calendar View

**Route:** `/crm/tasks?view=calendar`
**Type:** calendar

**Layout:**
```
[Header: Month/Week toggle | < Предыдущий | Март 2026 | Следующий > | Сегодня]
[Calendar Grid]
  Month view: 7 cols, каждый день — ячейка со списком задач (dots + первые 2 названия)
  Week view: 7 cols с временными слотами, задачи как блоки в ячейках
[Click task → Task Detail Modal]
```

---

### Screen 7 — Analytics Dashboard

**Route:** `/crm/analytics`
**Type:** dashboard

**Layout:**
```
[Period Filter Bar — sticky]
  [Today] [Yesterday] [This Week] [This Month] [Custom Range ▾]

[Stat Cards Row — 3 колонки по 2 карточки]
  [Total Tasks: 124]  [Completed: 89 (72%)]  [Overdue: 12]
  [New Leads: 47]     [Avg Response: 3.2h]   [Sales Forecast: $48,200]

[Charts Grid — 2 колонки]
  Left: Lead Sources (PieChart + legend)
  Right: Funnel Conversion (horizontal funnel/step chart)

[Full-width: Revenue by Manager (BarChart)]

[Two-column tables]
  Left: Loss Reasons (horizontal bar chart)
  Right: Deals by Manager (table)

[Bottom Row Stats]
  [Avg Time to Close] [Avg Touches to Close] [Manager Efficiency Table]
```

**Stat Card structure:**
```
[Icon (colored)] [Label]
[Big Number]
[Delta vs prev period: +12% ▲ (green) or -5% ▼ (red)]
```

---

### Screen 8 — Settings: Funnels List

**Route:** `/crm/settings/funnels`
**Type:** admin
**Access:** Director only

**Layout:**
```
[Page Header: "Воронки" | [+ Создать воронку]]

[Cards Grid: 3 columns]
  [Funnel Card]
    [Name]
    [X этапов | Y лидов]
    [Status: Active / Archived badge]
    [Actions: Edit | Archive | ⋮]
```

**Empty state:**
```
[Иконка воронки]
["Нет воронок. Создайте первую воронку."]
[+ Создать воронку button]
```

---

### Screen 9 — Settings: Funnel Detail

**Route:** `/crm/settings/funnels/:id`
**Type:** admin

**Layout:**
```
[Breadcrumb: Настройки > Воронки > [Funnel Name]]
[Funnel Name (editable inline)] [Archived badge if archived]

[Two sections stacked]

─ ЭТАПЫ ──────────────────────────────────────────
[drag handle] [Color dot] [Stage Name] [Win% input] [Edit] [Delete]
[drag handle] [Color dot] [Stage Name] [Win% input] [Edit] [Delete]
[+ Добавить этап]

─ КАСТОМНЫЕ ПОЛЯ ─────────────────────────────────
[drag handle] [Field Icon] [Label: "Бюджет"] [Type: number] [Edit] [Delete]
[drag handle] [Field Icon] [Label: "Канал"] [Type: select] [Edit] [Delete]
[+ Добавить поле]
```

**Add/Edit Stage Inline Form:**
```
[Color picker (10 preset swatches)] [Name input] [Win probability %] [Save] [Cancel]
```

**Add/Edit Custom Field Form (Modal):**
```
[Label input]
[Type selector: text | number | date | select | multiselect | checkbox]
[If select/multiselect: Options list with drag reorder]
[Save] [Cancel]
```

---

### Screen 10 — Settings: Lead Sources

**Route:** `/crm/settings/sources`
**Type:** admin

**Layout:**
```
[Page Header: "Источники лидов" | [+ Добавить источник]]

[Table]
  Columns: Название | Тип | Статус | Действия
  Types: manual (ручной) | import (CSV) | api (webhook)
  Status toggle: Active / Inactive (switch)

[API source expanded row:]
  Webhook URL: [url input, readonly] [Copy]
  Secret: [••••••••] [Show] [Regenerate]
```

---

## 5. User Flows

---

### Flow 1 — Director: Настройка воронки с нуля

```
[/crm/settings/funnels]
  → Click "+ Создать воронку"
  → Modal: ввести название → Save
  → Redirect to /crm/settings/funnels/:id

[/crm/settings/funnels/:id]
  → Добавить этапы (Add stage × N, drag to reorder, set colors + win%)
  → Добавить кастомные поля (Add field × N, configure types)
  → Готово — вернуться к списку воронок

[/crm/settings/sources]
  → Добавить источники (manual / import / api)
  → Для api: скопировать webhook URL → передать внешнему сервису
```

### Flow 2 — Sales Manager: Работа с новым лидом

```
[/crm/leads — Kanban view]
  → Click "+ Добавить лид" в колонке "Новый"
  → Modal: заполнить имя, телефон, источник, кастомные поля → Save
  → Лид появляется в колонке

[Lead Card]
  → Click → открывается Lead Drawer (560px)
  → Tab "Info": проверить данные, при необходимости отредактировать
  → Tab "Timeline": нажать "Записать активность"
    → Форма: тип = "Звонок", исход = "Заинтересован", "Нужен follow-up" = ON
    → Save → активность появляется в ленте, автоматически создается задача

[Задача создана автоматически]
  → Уведомление в bell icon
  → Перейти в /crm/tasks → задача "Follow-up: Имя лида"
```

### Flow 3 — Sales Manager: Закрытие сделки (Won)

```
[Lead Drawer / Detail Page]
  → Лид прошел все этапы воронки
  → Click "Отметить как Won"
  → Confirmation Modal: "Лид будет отмечен как выигранный"
  → Confirm
  → Статус лида: Won (зеленый badge)
  → Появляется кнопка "Конвертировать в студента" → (CRM→LMS bridge)
```

### Flow 4 — Sales Manager: Закрытие сделки (Lost)

```
[Lead Drawer]
  → Click "Отметить как Lost"
  → Modal: выбрать причину из списка (настроенных Director'ом) + опциональный комментарий
  → Confirm → лид: статус Lost, причина сохранена в timeline
```

### Flow 5 — Director: Мониторинг команды

```
[/crm/analytics]
  → Выбрать период "This Month"
  → Просмотреть Deals by Manager table — выявить отстающего менеджера
  → Перейти в /crm/tasks → включить "Все менеджеры" → фильтр по менеджеру
  → Просмотреть задачи → выявить просроченные
  → Перейти в /crm/leads → фильтр: Assigned To = менеджер → Status = Active
  → Оценить стадии лидов
```

### Flow 6 — Sales Manager: CSV импорт лидов

```
[/crm/leads]
  → Click "Import CSV"
  → Wizard открывается (Modal 720px)

  [Step 1: Загрузка]
    → Drop or Browse CSV file
    → Preview первых 5 строк
    → Next

  [Step 2: Маппинг]
    → Каждой колонке CSV → выбрать поле лида (dropdown)
    → Системные поля: имя, телефон, email, источник
    → Кастомные поля воронки тоже доступны
    → Next

  [Step 3: Подтверждение]
    → Preview 10 лидов (таблица)
    → Счетчик: "48 лидов будут импортированы"
    → Warnings: "3 строки пропущены (нет телефона)"
    → Click "Импортировать"

  [Progress bar]
  [Result: "48 импортировано, 3 пропущено" — dismissible]
```

---

## 6. Role-Based UI

### Director

| Элемент | Поведение |
|---|---|
| Sidebar | Видит: Лиды, Задачи, Аналитика, **Настройки** |
| Tasks page | Toggle "Все менеджеры" → видит задачи всей команды + фильтр по менеджеру |
| Analytics | Видит данные по всем менеджерам; фильтр по менеджеру доступен |
| Lead Kanban | Фильтр "Assigned To" — все менеджеры |
| Funnel settings | Полный доступ: создание, архивирование воронок, кастомные поля |
| Lead status | Может менять статус Won/Lost на любом лиде |
| Lead deletion | Только Director может удалять лиды |
| Reversal | Только Director (Finance, но важно для роли) |

### Sales Manager (МПП)

| Элемент | Поведение |
|---|---|
| Sidebar | Видит: Лиды, Задачи, Аналитика. **Настройки — скрыты** |
| Tasks page | Видит только свои задачи; toggle "Все менеджеры" — недоступен |
| Analytics | Данные только по себе; фильтр менеджера — скрыт |
| Lead Kanban | Фильтр "Assigned To" — недоступен (видит только свои назначенные) |
| Funnel settings | Нет доступа |
| Lead conversion | Только Sales Manager может конвертировать Won лид в студента |
| Lead creation | Полный доступ |
| CSV import | Полный доступ |

---

## 7. UX Logic Considerations

### 7.1 Kanban и переназначение этапов

**Проблема:** При удалении этапа воронки в нём могут быть лиды.
**Решение:** При попытке удалить этап — Modal с предупреждением: "В этом этапе X лидов. Выберите этап для переноса:" → dropdown → Confirm.

### 7.2 Кастомные поля и их данные

**Проблема:** Если удалить кастомное поле, данные лидов будут потеряны.
**Решение:** При удалении поля — предупреждение: "Y лидов имеют данные в этом поле. Данные будут удалены безвозвратно." → подтверждение с вводом "DELETE".

### 7.3 Автосоздание задач

**Проблема:** Пользователь не знает, что задача создалась автоматически.
**Решение:**
- Toast notification: "Задача создана автоматически: 'Сделать первый контакт'"
- Badge на иконке "Задачи" в sidebar: +1

### 7.4 Оптимистичные обновления Kanban

**Проблема:** Задержка API при перетаскивании карточек.
**Решение:** DnD с optimistic update через TanStack Query. При ошибке API — возврат карточки на исходную позицию + error toast.

### 7.5 Поиск в реальном времени

**Проблема:** Частые API запросы при печати.
**Решение:** Debounce 300ms на поисковом инпуте. Skeleton placeholder во время загрузки. Минимум 2 символа для запуска поиска.

### 7.6 Пустые состояния (Empty States)

Каждое основное представление имеет собственный empty state:

| Экран | Empty State Message | CTA |
|---|---|---|
| Leads Kanban (нет лидов) | "Пока нет лидов в этой воронке" | + Добавить лид / Import CSV |
| Tasks | "У вас нет задач на сегодня" | + Создать задачу |
| Analytics (нет данных) | "Нет данных за выбранный период" | Изменить период |
| Funnels list | "Создайте первую воронку для начала работы" | + Создать воронку |
| Timeline (нет активностей) | "Активностей пока нет. Запишите первый контакт." | Записать активность |

### 7.7 Уведомления и Notification Bell

**Badge:** красный круг с числом непрочитанных над иконкой bell
**Dropdown (max-height: 400px, overflow scroll):**
```
[Заголовок: "Уведомления"] [Прочитать все]
─────────────────────────────────────
[Unread dot] [Task due soon: "Follow-up: Ахмедов — через 2 часа"]  [12:30]
[Unread dot] [New task: "Сделать первый контакт: Петров"]          [11:15]
             [Overdue: "Перезвонить: Сидорова"]                    [Вчера]
─────────────────────────────────────
[Посмотреть все уведомления →]
```

---

## 8. Component States

### Button States
| State | Visual |
|---|---|
| Default | `bg-primary-600 text-white` |
| Hover | `bg-primary-700` |
| Active / Pressed | `bg-primary-800` |
| Disabled | `bg-gray-200 text-gray-400 cursor-not-allowed` |
| Loading | Spinner icon + disabled |

### Input States
| State | Visual |
|---|---|
| Default | Border `gray-300`, bg white |
| Focus | Border `primary-500`, ring `primary-100` 2px |
| Error | Border `danger-500`, bg `danger-50` |
| Disabled | Bg `gray-100`, text `gray-400` |
| Success | Border `success-500` |

### Lead Card States
| State | Visual |
|---|---|
| Default | `shadow-sm`, bg white |
| Hover | `shadow-md`, border `primary-200` |
| Dragging | `shadow-drag`, opacity 80%, rotate 2deg |
| Won | Left border `success-500` 3px |
| Lost | Left border `danger-500` 3px, opacity 70% |

### Kanban Column States
| State | Visual |
|---|---|
| Default | Bg `gray-100` |
| Drag over (active drop zone) | Border `primary-400` dashed 2px, bg `primary-50` |

---

## Итог: Design Tokens Quick Reference

```css
/* Tailwind classes используемые чаще всего в CRM */

/* Layouts */
--sidebar-width: 240px;
--sidebar-collapsed: 64px;
--topbar-height: 64px;
--drawer-width: 560px;

/* Page background */
bg-gray-50

/* Cards */
bg-white rounded-lg shadow-sm border border-gray-200

/* Primary button */
bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded font-semibold

/* Sidebar */
bg-[#1E1B4B] text-[#C7D2FE]

/* Active nav item */
bg-[#312E81] text-white

/* Stage: Won */
text-emerald-700 bg-emerald-50 border-emerald-200

/* Stage: Lost */
text-red-700 bg-red-50 border-red-200

/* Priority: Critical */
text-red-700 bg-red-50

/* Priority: High */
text-orange-700 bg-orange-50

/* Priority: Medium */
text-blue-700 bg-blue-50

/* Priority: Low */
text-gray-700 bg-gray-100
```
