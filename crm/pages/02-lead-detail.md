# Страница 2: Детальная карточка лида

**Файл:** `crm/src/app/(crm)/leads/[id]/page.tsx`  
**Статус:** 🟢 Кастомные поля готовы

---

## Реализовано

### Кастомные поля — отображение
- `CustomFieldDisplay.tsx` — type-aware рендеринг по типу поля:
  - `text` → plain text
  - `number` → форматированное число (`toLocaleString('ru-RU')`)
  - `date` → `d MMMM yyyy` (ru locale)
  - `select` → фиолетовый badge
  - `multiselect` → набор badges
  - `checkbox` → зелёный "✓ Да" / серый "✗ Нет"
- Показываются **все поля** из схемы воронки (`useCustomFields`), включая пустые (→ "—")
- Порядок по `field.order`
- `multiselect` занимает `col-span-2`

### Кастомные поля — редактирование
- `CustomFieldInput.tsx` — type-aware inputs для LeadForm
  - `text`, `number`, `date` → стандартные `<input>`
  - `select` → `<select>` с options
  - `multiselect` → pill-кнопки (toggle), мультивыбор
  - `checkbox` → нативный checkbox + "Да/Нет"
- `LeadForm` обновлён:
  - `customFields` включены в `defaultValues`
  - `useWatch('funnelId')` — динамически подгружает поля выбранной воронки
  - Секция "Дополнительные поля" отображается ниже основных

### Demo данные
- `DEMO_CUSTOM_FIELDS` — 6 полей для воронки f1 (Направление, Бюджет, Дата контакта, Курсы, Рассрочка, Комментарий)
- Лиды `l1`, `l2`, `l3` имеют заполненные кастомные поля
- Demo adapter возвращает поля правильно (фильтр по funnelId)

---

## Оставшиеся задачи

- [ ] Inline-редактирование кастомного поля прямо на карточке
- [ ] Валидация обязательных кастомных полей
