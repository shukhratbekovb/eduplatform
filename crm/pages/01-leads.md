# Страница 1: Лиды

**Файл:** `crm/src/app/(crm)/leads/page.tsx`  
**Компоненты:** LeadKanban, LeadTable, LeadsFiltersBar, LeadForm, MarkLostDialog  
**Статус:** 🔴 Нужны правки

---

## Найденные проблемы

### 1. MOCK_MANAGERS пустой массив
```ts
const MOCK_MANAGERS: User[] = []  // строка 20
```
- Менеджеры нигде не подгружаются
- LeadForm и LeadsFiltersBar получают пустой список
- Фильтр по менеджеру не работает
- При создании лида нельзя назначить ответственного

**Фикс:** добавить хук `useManagers()` → `GET /crm/users?role=sales_manager`

---

### 2. Нет обработки ошибок загрузки
- Если `useFunnels()` или `useLeads()` вернёт ошибку — страница просто зависнет на спиннере
- Нет `error` state и UI для ошибки

**Фикс:** добавить `isError` из хуков и показывать сообщение об ошибке

---

### 3. Импорт CSV — кнопка-заглушка
```tsx
<Button variant="secondary" size="md">
  <Upload className="w-4 h-4" />
  Импорт CSV
</Button>
```
- Нет `onClick`, нет модального окна, нет логики

**Фикс:** добавить диалог с file input или пометить как `disabled` до реализации

---

### 4. currentFunnelId может быть пустой строкой
```ts
const currentFunnelId = activeFunnelId || activeFunnels[0]?.id || ''
```
- `useStages('')` и `useLeads('')` вызываются с пустым id
- Нужно проверять enabled условие в хуках

---

## Исправления

- [ ] Добавить `useManagers()` хук
- [ ] Обработка ошибок (`isError` → UI)
- [ ] CSV импорт — заглушка с `disabled` или диалог
- [ ] Защита от пустого `funnelId`
