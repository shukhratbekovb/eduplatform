'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X, GripVertical } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { customFieldSchema, type CustomFieldFormValues } from '@/lib/validators/crm/funnel.schema'
import type { CustomField, CustomFieldType } from '@/types/crm'

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text',        label: 'Текст' },
  { value: 'number',      label: 'Число' },
  { value: 'date',        label: 'Дата' },
  { value: 'select',      label: 'Выбор (один)' },
  { value: 'multiselect', label: 'Выбор (несколько)' },
  { value: 'checkbox',    label: 'Флажок' },
]

interface CustomFieldFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  field?: CustomField
  onSubmit: (values: CustomFieldFormValues) => void
  loading?: boolean
}

export function CustomFieldForm({ open, onOpenChange, field, onSubmit, loading }: CustomFieldFormProps) {
  const [fieldType, setFieldType] = useState<CustomFieldType>(field?.type ?? 'text')
  const [options, setOptions]     = useState<string[]>(field?.options ?? [''])

  const { register, handleSubmit, formState: { errors } } = useForm<any>({
    defaultValues: {
      label: field?.label ?? '',
      type:  field?.type  ?? 'text',
    },
  })

  const addOption    = () => setOptions((prev) => [...prev, ''])
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i))
  const editOption   = (i: number, val: string) =>
    setOptions((prev) => prev.map((o, idx) => idx === i ? val : o))

  const submit = (data: any) => {
    const values: any = { type: fieldType, label: data.label }
    if (fieldType === 'select' || fieldType === 'multiselect') {
      values.options = options.filter((o) => o.trim())
    }
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{field ? 'Редактировать поле' : 'Новое поле'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Название поля <span className="text-danger-500">*</span>
            </label>
            <Input
              {...register('label', { required: 'Обязательное поле' })}
              placeholder="Например: Бюджет"
              error={!!errors.label}
            />
            {errors.label && (
              <p className="mt-1 text-xs text-danger-500">{String(errors.label.message)}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип поля</label>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFieldType(t.value)}
                  className={`px-3 py-2 rounded text-sm text-left transition-colors border ${
                    fieldType === t.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options (for select/multiselect) */}
          {(fieldType === 'select' || fieldType === 'multiselect') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Варианты <span className="text-danger-500">*</span>
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <Input
                      value={opt}
                      onChange={(e) => editOption(i, e.target.value)}
                      placeholder={`Вариант ${i + 1}`}
                      className="flex-1"
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="p-1.5 text-gray-400 hover:text-danger-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Добавить вариант
                </button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={loading}>
              {field ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
