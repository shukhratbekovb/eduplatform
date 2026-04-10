'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { markLostSchema, type MarkLostValues } from '@/lib/validators/crm/lead.schema'
import { useMarkLeadLost } from '@/lib/hooks/crm/useLeads'
import { useT } from '@/lib/i18n'

interface MarkLostDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  leadId: string
  leadName: string
}

export function MarkLostDialog({ open, onOpenChange, leadId, leadName }: MarkLostDialogProps) {
  const t = useT()
  const { mutate: markLost, isPending } = useMarkLeadLost()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MarkLostValues>({
    resolver: zodResolver(markLostSchema),
  })

  const onSubmit = (values: MarkLostValues) => {
    markLost(
      { leadId, dto: { reason: values.reason } },
      { onSuccess: () => { onOpenChange(false); reset() } }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('markLost.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('markLost.descStart')}<strong>{leadName}</strong>{t('markLost.descEnd')}
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('markLost.reason')} <span className="text-danger-500">*</span>
            </label>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder={t('markLost.placeholder')}
              className={`w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-colors ${errors.reason ? 'border-danger-500' : 'border-gray-300'}`}
            />
            {errors.reason && (
              <p className="mt-1 text-xs text-danger-500">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="danger" loading={isPending}>{t('markLost.btn')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
