import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mupTasksApi } from '@/lib/api/lms/tasks'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { CreateMupTaskDto, MupTask, MupTaskFilters } from '@/types/lms'

export function useMupTasks(filters?: MupTaskFilters) {
  const params = filters
    ? Object.fromEntries(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      )
    : undefined
  return useQuery({
    queryKey: lmsKeys.mupTasks(params),
    queryFn:  () => mupTasksApi.list(params),
  })
}

export function useCreateMupTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMupTaskDto) => mupTasksApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'mup-tasks'] })
      toast.success('Задача создана')
    },
    onError: () => toast.error('Не удалось создать задачу'),
  })
}

export function useUpdateMupTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateMupTaskDto> }) =>
      mupTasksApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'mup-tasks'] })
    },
    onError: () => toast.error('Не удалось обновить задачу'),
  })
}

export function useMoveMupTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MupTask['status'] }) =>
      mupTasksApi.move(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['lms', 'mup-tasks'] })
      const prev = qc.getQueriesData({ queryKey: ['lms', 'mup-tasks'] })
      qc.setQueriesData({ queryKey: ['lms', 'mup-tasks'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return old.map((t: MupTask) => t.id === id ? { ...t, status } : t)
      })
      return { prev }
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) ctx.prev.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error('Не удалось переместить задачу')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['lms', 'mup-tasks'] }),
  })
}

export function useDeleteMupTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => mupTasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'mup-tasks'] })
      toast.success('Задача удалена')
    },
    onError: () => toast.error('Не удалось удалить задачу'),
  })
}
