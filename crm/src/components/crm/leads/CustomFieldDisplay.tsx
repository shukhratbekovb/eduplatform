'use client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { CustomField, CustomFieldValue } from '@/types/crm'

interface Props {
  field: CustomField
  value: CustomFieldValue
}

/**
 * Renders a single custom field value with type-aware formatting.
 */
export function CustomFieldDisplay({ field, value }: Props) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 dark:text-gray-500">—</span>
  }

  switch (field.type) {
    case 'checkbox':
      return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          value
            ? 'bg-success-50 dark:bg-green-900/30 text-success-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}>
          {value ? '✓ Да' : '✗ Нет'}
        </span>
      )

    case 'select':
      return (
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
          {String(value)}
        </span>
      )

    case 'multiselect': {
      const items = Array.isArray(value) ? value : []
      if (items.length === 0) return <span className="text-gray-400 dark:text-gray-500">—</span>
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <span
              key={item}
              className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
            >
              {item}
            </span>
          ))}
        </div>
      )
    }

    case 'date': {
      try {
        return (
          <span className="text-gray-900 dark:text-gray-100">
            {format(new Date(String(value)), 'd MMMM yyyy', { locale: ru })}
          </span>
        )
      } catch {
        return <span className="text-gray-900 dark:text-gray-100">{String(value)}</span>
      }
    }

    case 'number':
      return (
        <span className="text-gray-900 dark:text-gray-100 tabular-nums">
          {Number(value).toLocaleString('ru-RU')}
        </span>
      )

    default:
      return <span className="text-gray-900 dark:text-gray-100">{String(value)}</span>
  }
}
