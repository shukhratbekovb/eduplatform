'use client'
import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateGroup, useUpdateGroup } from '@/lib/hooks/lms/useGroups'
import { useDirections, useSubjects } from '@/lib/hooks/lms/useSettings'
import { useTeachers } from '@/lib/hooks/lms/useStudents'
import { createGroupSchema } from '@/lib/validators/lms/group.schema'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { z } from 'zod'
import type { Group } from '@/types/lms'

type FormValues = z.infer<typeof createGroupSchema>

interface GroupFormProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  editGroup?:    Group
}

export function GroupForm({ open, onOpenChange, editGroup }: GroupFormProps) {
  const { data: directions = [] }          = useDirections()
  const { data: teachers = [] }            = useTeachers()
  const { mutate: createGroup, isPending: creating } = useCreateGroup()
  const { mutate: updateGroup, isPending: updating } = useUpdateGroup()

  const [dirId, setDirId] = useState(editGroup?.directionId ?? '')
  const { data: subjects = [] } = useSubjects(dirId || undefined)

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(createGroupSchema) })

  useEffect(() => {
    if (open) {
      if (editGroup) {
        reset({
          name:        editGroup.name,
          directionId: editGroup.directionId,
          subjectId:   editGroup.subjectId,
          teacherId:   editGroup.teacherId,
          startDate:   editGroup.startDate,
          endDate:     editGroup.endDate,
        })
        setDirId(editGroup.directionId)
      } else {
        reset({ name: '', directionId: '', subjectId: '', teacherId: '', startDate: '', endDate: '' })
        setDirId('')
      }
    }
  }, [open, editGroup, reset])

  const onSubmit = (values: FormValues) => {
    if (editGroup) {
      updateGroup(
        { id: editGroup.id, data: values },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createGroup(values, { onSuccess: () => onOpenChange(false) })
    }
  }

  const isPending = creating || updating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editGroup ? 'Редактировать группу' : 'Создать группу'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Название группы *</label>
                <Input {...register('name')} placeholder="Например: Алгебра 9А" error={!!errors.name} />
                {errors.name && <p className="mt-1 text-xs text-danger-500">{errors.name.message}</p>}
              </div>

              {/* Direction */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Направление *</label>
                <Controller
                  name="directionId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      onChange={(e) => { field.onChange(e); setDirId(e.target.value); setValue('subjectId', '') }}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                    >
                      <option value="">— Выберите направление —</option>
                      {(directions as any[]).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.directionId && <p className="mt-1 text-xs text-danger-500">{errors.directionId.message}</p>}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Предмет *</label>
                <Controller
                  name="subjectId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      disabled={!dirId}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">— Выберите предмет —</option>
                      {(subjects as any[]).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.subjectId && <p className="mt-1 text-xs text-danger-500">{errors.subjectId.message}</p>}
              </div>

              {/* Teacher */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Преподаватель *</label>
                <Controller
                  name="teacherId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                    >
                      <option value="">— Выберите преподавателя —</option>
                      {(teachers as any[]).map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.teacherId && <p className="mt-1 text-xs text-danger-500">{errors.teacherId.message}</p>}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Дата начала *</label>
                  <Input type="date" {...register('startDate')} error={!!errors.startDate} />
                  {errors.startDate && <p className="mt-1 text-xs text-danger-500">{errors.startDate.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Дата окончания *</label>
                  <Input type="date" {...register('endDate')} error={!!errors.endDate} />
                  {errors.endDate && <p className="mt-1 text-xs text-danger-500">{errors.endDate.message as string}</p>}
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" loading={isPending}>
              {editGroup ? 'Сохранить' : 'Создать группу'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
