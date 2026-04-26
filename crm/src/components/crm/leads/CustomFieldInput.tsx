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
        <button
          type="button"
          onClick={() => formField.onChange(!checked)}
          className="flex items-center gap-2.5 cursor-pointer select-none pt-1 group"
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
            checked
              ? 'bg-primary-600 border-primary-600'
              : 'border-gray-300 dark:border-gray-500 group-hover:border-primary-400'
          }`}>
            {checked && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={`text-sm transition-colors ${
            checked ? 'text-primary-600 font-medium' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {checked ? 'Да' : 'Нет'}
          </span>
        </button>
      )
    }

    default:
      return null
  }
}
