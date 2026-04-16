'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFunnels } from '@/lib/hooks/crm/useFunnels'
import { useT } from '@/lib/i18n'
import type { LeadSource, LeadSourceType } from '@/types/crm'

const schema = z.object({
  name: z.string().min(1, 'Название обязательно').max(60),
  type: z.enum(['manual', 'import', 'api', 'landing']),
  funnelId: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'api' || data.type === 'landing') return !!data.funnelId
    return true
  },
  { message: 'Выберите воронку для API/Лендинг источника', path: ['funnelId'] },
)
type Values = z.infer<typeof schema>

const TYPES: { value: LeadSourceType; labelKey: string; hintKey: string }[] = [
  { value: 'manual',  labelKey: 'source.type.manual',  hintKey: 'source.hint.manual' },
  { value: 'import',  labelKey: 'source.type.import',  hintKey: 'source.hint.import' },
  { value: 'api',     labelKey: 'source.type.api',     hintKey: 'source.hint.api' },
  { value: 'landing', labelKey: 'source.type.landing',  hintKey: 'source.hint.landing' },
]

interface SourceFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  source?: LeadSource
  onSave: (values: Values) => void
  isPending?: boolean
}

export function SourceForm({ open, onOpenChange, source, onSave, isPending }: SourceFormProps) {
  const t = useT()
  const isEdit = !!source
  const { data: funnels = [] } = useFunnels()
  const activeFunnels = funnels.filter((f) => !f.isArchived)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<Values>({
      resolver: zodResolver(schema),
      defaultValues: source
        ? { name: source.name, type: source.type, funnelId: source.funnelId || '' }
        : { name: '', type: 'manual', funnelId: '' },
    })

  useEffect(() => {
    if (open) {
      reset(source
        ? { name: source.name, type: source.type, funnelId: source.funnelId || '' }
        : { name: '', type: 'manual', funnelId: '' },
      )
    }
  }, [open, source])

  const selectedType = watch('type')
  const needsFunnel = selectedType === 'api' || selectedType === 'landing'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('common.edit') : t('sources.form.title')}</DialogTitle>
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
              {TYPES.map(({ value, labelKey, hintKey }) => (
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
                    <p className="text-sm font-medium text-gray-900">{t(labelKey)}</p>
                    <p className="text-xs text-gray-500">{t(hintKey)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {needsFunnel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('sources.form.funnel')} <span className="text-danger-500">*</span>
              </label>
              <select
                {...register('funnelId')}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">{t('sources.selectFunnel')}</option>
                {activeFunnels.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {errors.funnelId && <p className="mt-1 text-xs text-danger-500">{errors.funnelId.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isPending}>
              {isEdit ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
