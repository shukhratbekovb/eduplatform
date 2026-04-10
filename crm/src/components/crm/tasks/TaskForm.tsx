'use client'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LeadCombobox } from '@/components/crm/shared/LeadCombobox'
import { taskSchema, type TaskFormValues } from '@/lib/validators/crm/task.schema'
import { useCreateTask, useUpdateTask } from '@/lib/hooks/crm/useTasks'
import { useManagers } from '@/lib/hooks/crm/useLeads'
import { cn } from '@/lib/utils/cn'
import type { Task, TaskStatus } from '@/types/crm'

const PRIORITIES = [
  { value: 'low',      label: 'Низкий' },
  { value: 'medium',   label: 'Средний' },
  { value: 'high',     label: 'Высокий' },
  { value: 'critical', label: 'Критический' },
] as const

interface TaskFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  task?: Task
  defaultStatus?: TaskStatus
}

export function TaskForm({ open, onOpenChange, task, defaultStatus }: TaskFormProps) {
  const isEdit = !!task
  const { mutate: createTask, isPending: creating } = useCreateTask()
  const { mutate: updateTask, isPending: updating }  = useUpdateTask()
  const { data: managers = [] }                      = useManagers()
  const isPending = creating || updating

  const now = new Date()
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<TaskFormValues>({
      resolver: zodResolver(taskSchema),
      defaultValues: task
        ? {
            title:        task.title,
            description:  task.description ?? '',
            linkedLeadId: task.linkedLeadId ?? '',
            assignedTo:   task.assignedTo,
            dueDate:      task.dueDate.slice(0, 16),
            priority:     task.priority,
            reminderAt:   task.reminderAt?.slice(0, 16) ?? '',
          }
        : {
            title:       '',
            description: '',
            assignedTo:  '',
            dueDate:     localIso,
            priority:    'medium',
          },
    })

  useEffect(() => {
    if (open) {
      reset(
        task
          ? {
              title:        task.title,
              description:  task.description ?? '',
              linkedLeadId: task.linkedLeadId ?? '',
              assignedTo:   task.assignedTo,
              dueDate:      task.dueDate.slice(0, 16),
              priority:     task.priority,
              reminderAt:   task.reminderAt?.slice(0, 16) ?? '',
            }
          : {
              title:       '',
              description: '',
              assignedTo:  '',
              dueDate:     localIso,
              priority:    'medium',
            }
      )
    }
  }, [open, task])

  const onSubmit = (values: TaskFormValues) => {
    const dto = {
      ...values,
      linkedLeadId: values.linkedLeadId || undefined,
      reminderAt:   values.reminderAt   || undefined,
    }

    if (isEdit) {
      updateTask(
        { id: task!.id, dto },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createTask(dto, { onSuccess: () => { onOpenChange(false); reset() } })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Изменить задачу' : 'Новая задача'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Название <span className="text-danger-500">*</span>
            </label>
            <Input
              {...register('title')}
              placeholder="Позвонить клиенту…"
              error={!!errors.title}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-danger-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Детали задачи…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
          </div>

          {/* Priority + Due date (2 cols) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Приоритет <span className="text-danger-500">*</span>
              </label>
              <select
                {...register('priority')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Срок <span className="text-danger-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('dueDate')}
                className={cn(
                  'w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
                  errors.dueDate ? 'border-danger-500' : 'border-gray-300'
                )}
              />
              {errors.dueDate && (
                <p className="mt-1 text-xs text-danger-500">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ответственный <span className="text-danger-500">*</span>
            </label>
            <select
              {...register('assignedTo')}
              className={cn(
                'w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
                errors.assignedTo ? 'border-danger-500' : 'border-gray-300'
              )}
            >
              <option value="">— Выберите менеджера —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            {errors.assignedTo && (
              <p className="mt-1 text-xs text-danger-500">{errors.assignedTo.message}</p>
            )}
          </div>

          {/* Linked lead */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Привязанный лид</label>
            <Controller
              control={control}
              name="linkedLeadId"
              render={({ field }) => (
                <LeadCombobox
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Напоминание</label>
            <input
              type="datetime-local"
              {...register('reminderAt')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
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
