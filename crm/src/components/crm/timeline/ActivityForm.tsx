'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Phone, Users, MessageSquare, Activity as ActivityIcon, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { activitySchema, type ActivityFormValues } from '@/lib/validators/crm/activity.schema'
import { useCreateActivity } from '@/lib/hooks/crm/useLeads'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'

const TYPES = [
  { value: 'call',    key: 'activity.type.call',    icon: Phone },
  { value: 'meeting', key: 'activity.type.meeting',  icon: Users },
  { value: 'message', key: 'activity.type.message',  icon: MessageSquare },
  { value: 'other',   key: 'activity.type.other',    icon: ActivityIcon },
] as const

const MESSAGE_CHANNELS = ['WhatsApp', 'Telegram', 'Email', 'Другое']

interface ActivityFormProps {
  leadId: string
  onClose: () => void
}

export function ActivityForm({ leadId, onClose }: ActivityFormProps) {
  const t = useT()
  const { mutate: createActivity, isPending } = useCreateActivity(leadId)

  const now = new Date()
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } =
    useForm<ActivityFormValues>({
      resolver: zodResolver(activitySchema),
      defaultValues: {
        type:          'call',
        date:          localIso,
        outcome:       '',
        needsFollowUp: false,
      },
    })

  const type = watch('type')

  const onSubmit = (values: ActivityFormValues) => {
    // Clean up fields not relevant to the selected type
    const dto = {
      type: values.type,
      date: values.date,
      outcome: values.outcome,
      notes: values.notes || undefined,
      needsFollowUp: values.needsFollowUp,
      durationMinutes: values.type === 'call' && values.durationMinutes
        ? Number(values.durationMinutes) : undefined,
      channel: values.type === 'message' ? values.channel || undefined : undefined,
    }
    createActivity(dto, {
      onSuccess: () => { reset(); onClose() },
    })
  }

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-4 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-800">{t('activity.form.title')}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Type selector */}
        <div className="flex gap-2">
          {TYPES.map(({ value, key, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setValue('type', value)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border transition-colors',
                type === value
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(key)}
            </button>
          ))}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('activity.form.date')} <span className="text-danger-500">*</span>
          </label>
          <input
            type="datetime-local"
            {...register('date')}
            className={cn(
              'border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-colors',
              errors.date ? 'border-danger-500' : 'border-gray-300'
            )}
          />
          {errors.date && <p className="mt-1 text-xs text-danger-500">{errors.date.message}</p>}
        </div>

        {/* Duration (call only) */}
        {type === 'call' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('activity.form.duration')}
            </label>
            <input
              type="number"
              min={1}
              {...register('durationMinutes', { valueAsNumber: true })}
              placeholder="Например: 15"
              className="w-32 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>
        )}

        {/* Channel (message only) */}
        {type === 'message' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('activity.form.channel')}</label>
            <select
              {...register('channel')}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            >
              <option value="">— Выберите —</option>
              {MESSAGE_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
        )}

        {/* Outcome */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('activity.form.outcome')} <span className="text-danger-500">*</span>
          </label>
          <textarea
            {...register('outcome')}
            rows={2}
            placeholder="Кратко опишите итог…"
            className={cn(
              'w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-colors',
              errors.outcome ? 'border-danger-500' : 'border-gray-300'
            )}
          />
          {errors.outcome && <p className="mt-1 text-xs text-danger-500">{errors.outcome.message}</p>}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('activity.form.notes')}</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Дополнительные детали…"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
        </div>

        {/* Follow-up */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('needsFollowUp')}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('activity.form.followUp')}</span>
        </label>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button type="submit" size="sm" loading={isPending}>
            <Check className="w-3.5 h-3.5" />
            {t('activity.form.save')}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
