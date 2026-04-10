'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ChartModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function ChartModal({ title, open, onClose, children }: ChartModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-fade-in" />
        <Dialog.Content
          className="fixed inset-4 md:inset-8 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col animate-scale-in overflow-hidden"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
