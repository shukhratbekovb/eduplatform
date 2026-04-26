'use client'
import { useController, type Control } from 'react-hook-form'
import { DatePicker } from '@/components/ui/date-picker'
import type { CustomField } from '@/types/crm'
import type { LeadFormValues } from '@/lib/validators/crm/lead.schema'

function getChoices(field: CustomField): string[] {
  if (Array.isArray(field.options)) return field.options
  if (field.options && typeof field.options === 'object' && 'choices' in field.options) {
    return (field.options as any).choices ?? []
  }
  return []
}

interface Props {
  field: CustomField
  control: Control<LeadFormValues>
}

const inputClass =
  'w-full h-10 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm ' +
  'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500'

/**
 * Type-aware input bound to react-hook-form.
 * Uses `customFields.${field.id}` as the form field name.
 */
export function CustomFieldInput({ field, control }: Props) {
  const fieldName = `customFields.${field.id}` as any

  const { field: formField } = useController({
    control,
    name: fieldName,
    defaultValue: field.type === 'checkbox' ? false : field.type === 'multiselect' ? [] : '',
  })

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          className={inputClass}
          value={formField.value ?? ''}
          onChange={(e) => formField.onChange(e.target.value)}
        />
      )

    case 'number':
      return (
        <input
          type="number"
          className={inputClass}
          value={formField.value ?? ''}
          onChange={(e) => formField.onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )

    case 'date':
      return (
        <DatePicker
          value={formField.value ?? ''}
          onChange={(v) => formField.onChange(v)}
        />
      )

    case 'select':
      return (
        <select
          className={inputClass}
          value={formField.value ?? ''}
          onChange={(e) => formField.onChange(e.target.value)}
        >
          <option value="">— не выбрано —</option>
          {getChoices(field).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )

    case 'multiselect': {
      const selected: string[] = Array.isArray(formField.value) ? formField.value : []
      const toggle = (opt: string) => {
        const next = selected.includes(opt)
          ? selected.filter((v) => v !== opt)
          : [...selected, opt]
        formField.onChange(next)
      }
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {getChoices(field).map((opt) => {
            const active = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  active
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary-400'
                }`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )
    }

    case 'checkbox': {
      const checked = Boolean(formField.value)
      return (
        <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => formField.onChange(e.target.checked)}
            className="w-4 h-4 accent-primary-600 cursor-pointer"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {checked ? 'Да' : 'Нет'}
          </span>
        </label>
      )
    }

    default:
      return null
  }
}
