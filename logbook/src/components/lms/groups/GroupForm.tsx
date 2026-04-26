'use client'
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateGroup, useUpdateGroup } from '@/lib/hooks/lms/useGroups'
import { useDirections } from '@/lib/hooks/lms/useSettings'
import { createGroupSchema } from '@/lib/validators/lms/group.schema'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { useT } from '@/lib/i18n'
import type { z } from 'zod'
import type { Group } from '@/types/lms'

type FormValues = z.infer<typeof createGroupSchema>

interface GroupFormProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  editGroup?:    Group
}

export function GroupForm({ open, onOpenChange, editGroup }: GroupFormProps) {
  const t = useT()
  const { mutate: createGroup, isPending: creating } = useCreateGroup()
  const { mutate: updateGroup, isPending: updating } = useUpdateGroup()
  const { data: directions = [] } = useDirections()

  const { register, handleSubmit, control, reset, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(createGroupSchema) })

  useEffect(() => {
    if (open) {
      if (editGroup) {
        reset({
          name:        editGroup.name,
          directionId: editGroup.directionId ?? '',
          startDate:   editGroup.startDate ?? '',
          endDate:     editGroup.endDate ?? '',
        })
      } else {
        reset({ name: '', directionId: '', startDate: '', endDate: '' })
      }
    }
  }, [open, editGroup, reset])

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, directionId: values.directionId || undefined }
    if (editGroup) {
      updateGroup({ id: editGroup.id, data: payload }, { onSuccess: () => onOpenChange(false) })
    } else {
      createGroup(payload, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editGroup ? t('groups.editGroup') : t('groups.createGroup')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('groups.groupName')} *</label>
                <Input {...register('name')} placeholder={t('groups.groupNamePlaceholder')} error={!!errors.name} />
                {errors.name && <p className="mt-1 text-xs text-danger-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('groups.direction')}</label>
                <Controller
                  name="directionId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                    >
                      <option value="">{t('groups.noDirection')}</option>
                      {(directions as any[]).map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('groups.startDate')}</label>
                  <Controller name="startDate" control={control} render={({ field }) => (
                    <DatePicker value={field.value} onChange={field.onChange} />
                  )} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('groups.endDate')}</label>
                  <Controller name="endDate" control={control} render={({ field }) => (
                    <DatePicker value={field.value} onChange={field.onChange} error={!!errors.endDate} />
                  )} />
                  {errors.endDate && <p className="mt-1 text-xs text-danger-500">{errors.endDate.message as string}</p>}
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={creating || updating}>
              {editGroup ? t('common.save') : t('groups.createGroup')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
