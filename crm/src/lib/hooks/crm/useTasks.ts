'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { tasksApi, notificationsApi } from '@/lib/api/crm/tasks'
import { crmKeys } from '@/lib/api/crm/query-keys'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import type { CreateTaskDto, UpdateTaskDto, TaskStatus } from '@/types/crm'

export function useTasks() {
  const filters              = useCrmStore((s) => s.tasksFilters)
  const showAll              = useCrmStore((s) => s.showAllManagersTasks)
  const managerFilter        = useCrmStore((s) => s.taskManagerFilter)
  return useQuery({
    queryKey: crmKeys.tasks({ ...filters, all: showAll }),
    queryFn:  () => tasksApi.list({
      ...filters,
      all: showAll,
      ...(managerFilter ? { assignedTo: [managerFilter] } : {}),
    }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTaskDto) => tasksApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'tasks'] })
      toast.success('Задача создана')
    },
    onError: () => toast.error('Не удалось создать задачу'),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTaskDto }) =>
      tasksApi.update(id, dto),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: crmKeys.task(id) })
      qc.invalidateQueries({ queryKey: ['crm', 'tasks'] })
    },
    onError: () => toast.error('Не удалось обновить задачу'),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm', 'tasks'] })
      toast.success('Задача удалена')
    },
    onError: () => toast.error('Не удалось удалить задачу'),
  })
}

export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.move(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['crm', 'tasks'] })
      const snapshots = qc.getQueriesData<any[]>({ queryKey: ['crm', 'tasks'] })
      qc.setQueriesData<any[]>({ queryKey: ['crm', 'tasks'] }, (old) =>
        old?.map((t) => t.id === id ? { ...t, status } : t)
      )
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error('Не удалось переместить задачу')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['crm', 'tasks'] }),
  })
}

// ── Notifications ──────────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: crmKeys.notifications(),
    queryFn:  () => notificationsApi.list(),
    staleTime: 0,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.notifications() }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.notifications() }),
  })
}
