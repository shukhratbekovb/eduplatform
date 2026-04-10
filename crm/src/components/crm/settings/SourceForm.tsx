'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LeadSource, LeadSourceType } from '@/types/crm'

const schema = z.object({
  name: z.string().min(1, 'Название обязательно').max(60),
  type: z.enum(['manual', 'import', 'api']),
})
type Values = z.infer<typeof schema>

const TYPES: { value: LeadSourceType; label: string; hint: string }[] = [
  { value: 'manual', label: 'Ручной',       hint: 'Менеджеры добавляют лидов вручную' },
  { value: 'import', label: 'CSV импорт',   hint: 'Загрузка через файл' },
  { value: 'api',    label: 'API / Webhook', hint: 'Автоматический приём через HTTP' },
]

interface SourceFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  source?: LeadSource
  onSave: (values: Values) => void
  isPending?: boolean
}

export function SourceForm({ open, onOpenChange, source, onSave, isPending }: SourceFormProps) {
  const isEdit = !!source

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: source
        ? { name: source.name, type: source.type }
        : { name: '', type: 'manual' },
    })

  useEffect(() => {
    if (open) {
      reset(source ? { name: source.name, type: source.type } : { name: '', type: 'manual' })
    }
  }, [open, source])

  const selectedType = watch('type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать источник' : 'Новый источник'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Название <span className="text-danger-500">*</span>
            </label>
            <Input
              {...register('name')}
              placeholder="Например: Instagram, Сайт, Яндекс…"
              error={!!errors.name}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-danger-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип</label>
            <div className="space-y-2">
              {TYPES.map(({ value, label, hint }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedType === value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={value}
                    checked={selectedType === value}
                    onChange={() => setValue('type', value)}
                    className="mt-0.5 accent-primary-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
