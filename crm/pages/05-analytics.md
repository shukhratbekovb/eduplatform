# Страница 5: Аналитика

**Файл:** `crm/src/app/(crm)/analytics/page.tsx`  
**Компоненты:** OverviewCards, LeadsBySourceChart, FunnelConversionChart, LossReasonsChart, ManagerStatsTable  
**Статус:** 🟡 В работе

---

## Реализовано

### Sankey диаграмма — Источник → Этап → Результат
- `SankeyChart.tsx` — чистый SVG, без внешних зависимостей
- Три колонки: источники лидов / этапы воронки / результаты (В работе / Выиграно / Проиграно)
- Ширина потока пропорциональна количеству лидов
- Tooltip при наведении на поток: «Instagram → Квалификация: 2 лида»
- Цвета: источники — синий/розовый/оранжевый/фиолетовый; этапы — цвет из настроек воронки; результаты — зелёный/красный/индиго
- Demo adapter вычисляет данные на лету из текущего состояния `leads` (без хардкода)
- Тип `SankeyData` добавлен в `types/crm/analytics.ts`
- API метод `analyticsApi.sankey()` + хук `useAnalyticsSankey()`
- Dark mode поддержан (fill-классы через Tailwind)

---

## Оставшиеся задачи

- [ ] Фильтрация Sankey по менеджеру
- [ ] Drill-down: клик по потоку → список лидов
- [ ] Остальные компоненты страницы (OverviewCards, LeadsBySourceChart и др.) — аудит
