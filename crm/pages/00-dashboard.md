# Страница 0: Dashboard (Главная)

**Файл:** `crm/src/app/(crm)/dashboard/page.tsx`  
**Статус:** 🟢 Готово

---

## Реализовано

### Инфраструктура
- `src/lib/stores/useThemeStore.ts` — dark/light тема (Zustand + persist)
- `src/lib/stores/useI18nStore.ts` — язык ru/en (Zustand + persist)
- `src/lib/i18n/ru.ts` + `en.ts` + `index.ts` — переводы + хук `useT()`
- `src/components/shared/ThemeProvider.tsx` — добавляет `.dark` к `<html>`
- `src/app/globals.css` — dark mode CSS
- `src/types/crm/analytics.ts` — добавлен `LeadsOverTimeStat`
- `src/lib/api/crm/analytics.ts` — добавлен `leadsOverTime()`
- `src/lib/hooks/crm/useAnalytics.ts` — добавлен `useLeadsOverTime()`
- `src/lib/demo/data.ts` — добавлен `DEMO_ANALYTICS.leadsOverTime` (30 дней)
- `src/lib/demo/adapter.ts` — обработка `/analytics/leads-over-time`

### Dashboard компоненты
- `KpiCard.tsx` — карточка метрики с дельтой (▲▼), цветами, skeleton
- `ChartCard.tsx` — обёртка для графиков с кнопкой "Развернуть"
- `ChartModal.tsx` — full-screen модальное окно для любого графика
- `DashboardFilters.tsx` — period picker + funnel + manager (для директора)
- `LeadsOverTimeChart.tsx` — line chart (новые + выиграно, recharts)
- `DashLeadsBySourceChart.tsx` — donut pie chart по источникам
- `DashFunnelConvChart.tsx` — bar chart конверсии воронки
- `ManagersTable.tsx` — таблица статистики менеджеров
- `TodayTasksList.tsx` — задачи на сегодня с приоритет-dot
- `OverdueTasksList.tsx` — просроченные задачи со списком
- `ManagerRanking.tsx` — рейтинг менеджеров (🥇🥈🥉)

### Обновлено
- `src/app/(crm)/page.tsx` — redirect `/` → `/dashboard`
- `src/app/layout.tsx` — ThemeProvider подключён
- `src/app/(crm)/layout.tsx` — dark:bg-gray-900
- `CrmSidebar.tsx` — добавлен пункт "Главная" (LayoutDashboard)
- `CrmTopbar.tsx` — ThemeToggle (☀️/🌙) + LangToggle (RU/EN)

---

## Роли

| Блок | Директор | Менеджер |
|---|---|---|
| 5 KPI карточек (all managers) | ✅ | ❌ |
| 4 KPI карточки (personal) | ❌ | ✅ |
| Фильтр по воронке | ✅ | ❌ |
| Фильтр по менеджеру | ✅ | ❌ |
| График Leads Over Time | ✅ | ✅ |
| Leads by Source (pie) | ✅ | ✅ |
| Funnel Conversion | ✅ | ✅ |
| Таблица менеджеров | ✅ | ❌ |
| Задачи на сегодня | все | свои |
| Просроченные задачи | все | свои |
| Рейтинг менеджеров | ✅ | ✅ (видит своё место) |

---

## Функции

- Все графики открываются в full-screen модале (кнопка ↗ на каждом)
- Тёмная/светлая тема — переключатель в topbar, сохраняется в localStorage
- Мультиязычность RU/EN — переключатель в topbar, сохраняется в localStorage
- Период: Сегодня / Вчера / Неделя / Месяц / Произвольный
