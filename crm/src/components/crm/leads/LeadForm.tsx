'use client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { leadSchema, type LeadFormValues } from '@/lib/validators/crm/lead.schema'
import { useCreateLead, useUpdateLead } from '@/lib/hooks/crm/useLeads'
import { useCustomFields } from '@/lib/hooks/crm/useFunnels'
import { useT } from '@/lib/i18n'
import { CustomFieldInput } from './CustomFieldInput'
import type { Lead, Funnel, Stage, LeadSource, User } from '@/types/crm'

interface LeadFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultStageId?: string
  defaultFunnelId?: string
  lead?: Lead           // если передан — режим редактирования
  funnels: Funnel[]
  stages: Stage[]
  sources: LeadSource[]
  managers: User[]
}

export function LeadForm({
  open, onOpenChange, defaultStageId, defaultFunnelId,
  lead, funnels, stages, sources, managers,
}: LeadFormProps) {
  const t = useT()
  const { mutate: createLead, isPending: creating } = useCreateLead()
  const { mutate: updateLead, isPending: updating }  = useUpdateLead()
  const isEdit = !!lead

  const {
    register, handleSubmit, reset, control,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: lead ? {
      fullName:     lead.fullName,
      phone:        lead.phone,
      email:        lead.email ?? '',
      sourceId:     lead.sourceId,
      funnelId:     lead.funnelId,
      stageId:      lead.stageId,
      assignedTo:   lead.assignedTo,
      customFields: lead.customFields ?? {},
    } : {
      funnelId:     defaultFunnelId ?? funnels[0]?.id ?? '',
      stageId:      defaultStageId  ?? stages[0]?.id ?? '',
      customFields: {},
    },
  })

  // Watch funnelId to load custom fields for the selected funnel
  const selectedFunnelId = useWatch({ control, name: 'funnelId' })
  const { data: customFieldDefs = [] } = useCustomFields(selectedFunnelId ?? '')

  const onSubmit = (values: LeadFormValues) => {
    if (isEdit && lead) {
      updateLead(
        { id: lead.id, dto: values },
        { onSuccess: () => { onOpenChange(false) } }
      )
    } else {
      createLead(values, {
        onSuccess: () => { onOpenChange(false); reset() }
      })
    }
  }

  function Field({ name, label, required, children }: {
    name: keyof LeadFormValues; label: string; required?: boolean; children: React.ReactNode
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label} {required && <span className="text-danger-500">*</span>}
        </label>
        {children}
        {errors[name] && (
          <p className="mt-1 text-xs text-danger-500">{errors[name]?.message as string}</p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('leadForm.titleEdit') : t('leadForm.titleCreate')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field name="fullName" label={t('leadForm.fullName')} required>
              <Input {...register('fullName')} placeholder="Иван Иванов" error={!!errors.fullName} />
            </Field>
            <Field name="phone" label={t('leadForm.phone')} required>
              <Input {...register('phone')} placeholder="+998 90 123 45 67" error={!!errors.phone} />
            </Field>
          </div>

          <Field name="email" label={t('leadForm.email')}>
            <Input {...register('email')} type="email" placeholder="ivan@example.com" error={!!errors.email} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field name="funnelId" label={t('leadForm.funnel')} required>
              <select
                {...register('funnelId')}
                className={`w-full h-10 border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${errors.funnelId ? 'border-danger-500' : 'border-gray-300'}`}
              >
                <option value="">{t('leadForm.placeholder.funnel')}</option>
                {funnels.filter((f) => !f.isArchived).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </Field>

            <Field name="stageId" label={t('leadForm.stage')} required>
              <select
                {...register('stageId')}
                className={`w-full h-10 border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${errors.stageId ? 'border-danger-500' : 'border-gray-300'}`}
              >
                <option value="">{t('leadForm.placeholder.stage')}</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field name="sourceId" label={t('leadForm.source')} required>
              <select
                {...register('sourceId')}
                className={`w-full h-10 border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${errors.sourceId ? 'border-danger-500' : 'border-gray-300'}`}
              >
                <option value="">{t('leadForm.placeholder.source')}</option>
                {sources.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

            <Field name="assignedTo" label={t('leadForm.manager')} required>
              <select
                {...register('assignedTo')}
                className={`w-full h-10 border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 ${errors.assignedTo ? 'border-danger-500' : 'border-gray-300'}`}
              >
                <option value="">{t('leadForm.placeholder.manager')}</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Custom Fields ─────────────────────────────────────── */}
          {customFieldDefs.length > 0 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('leadForm.customFields')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {customFieldDefs.map((cf) => (
                  <div key={cf.id} className={cf.type === 'multiselect' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {cf.label}
                    </label>
                    <CustomFieldInput field={cf} control={control} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={creating || updating}>
              {isEdit ? t('leadForm.btnSave') : t('leadForm.btnCreate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
