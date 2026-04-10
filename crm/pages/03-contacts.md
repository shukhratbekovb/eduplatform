# Страница 3: Контакты

**Файл:** `crm/src/app/(crm)/contacts/page.tsx`  
**Статус:** 🟡 Частично готово

---

## Найденные проблемы

### 1. Загружает лиды только из одной воронки
```ts
const activeId = funnels.find((f) => !f.isArchived)?.id ?? funnelIds[0]
return leadsApi.list({ funnelId: activeId, limit: 500 })
```
- Contacts = все лиды из всех воронок (по PRD §5.8)
- Сейчас берётся только первая активная воронка

**Фикс:** запрашивать все воронки параллельно через `Promise.all` или добавить backend endpoint `GET /crm/leads?all_funnels=true`

---

### 2. Нет сортировки
- PRD требует: сортировка по Name, Created At, Last Activity
- Сейчас порядок произвольный (как пришло с API)

**Фикс:** добавить `<select>` для sort + локальная сортировка массива

---

### 3. Нет Card view
- PRD §5.8 требует два вида: Table (default) и Card view
- Сейчас только таблица

**Фикс:** добавить переключатель вида + Card-компонент

---

### 4. Нет фильтра по менеджеру для Директора
- PRD: "Filter by assigned manager (Director only)"
- Сейчас фильтр по менеджеру отсутствует

---

### 5. Нет "Last Activity" колонки
- В таблице нет колонки последней активности
- В PRD она обязательна

---

## Исправления

- [x] Загрузка лидов из всех воронок — `Promise.all` по activeFunnelIds с дедупликацией
- [x] Сортировка (Name / Created At / Last Activity) — кликабельные заголовки + иконки ChevronUp/Down
- [x] Card view переключатель — List/LayoutGrid иконки в хэдере
- [x] Колонка Last Activity — через `formatRelativeDate()` (сегодня, вчера, N дн. назад)
- [ ] Фильтр по менеджеру (для Директора)
