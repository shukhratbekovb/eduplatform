'use client'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

interface ConfirmDialogProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  title:         string
  description?:  string
  confirmLabel?: string
  cancelLabel?:  string
  variant?:      'danger' | 'primary'
  onConfirm:     () => void
  loading?:      boolean
}

export function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel, cancelLabel,
  variant = 'danger', onConfirm, loading,
}: ConfirmDialogProps) {
  const t = useT()

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 animate-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-6 animate-scale-in">
          <AlertDialog.Title className="text-lg font-semibold text-gray-900 mb-2">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="text-sm text-gray-500 mb-5">
              {description}
            </AlertDialog.Description>
          )}
          <div className="flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" size="sm">{cancelLabel ?? t('common.cancel')}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={variant} size="sm" loading={loading} onClick={onConfirm}>
                {confirmLabel ?? t('common.confirm')}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
