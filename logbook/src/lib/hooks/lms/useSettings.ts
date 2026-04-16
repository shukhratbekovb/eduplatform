import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { settingsApi, notificationsApi } from '@/lib/api/lms/settings'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { CreateDirectionDto, CreateSubjectDto, CreateRoomDto } from '@/types/lms'

// ── Directions ────────────────────────────────────────────────────────────────

export function useDirections() {
  return useQuery({
    queryKey: lmsKeys.directions(),
    queryFn:  () => settingsApi.listDirections(),
    staleTime: 10 * 60_000,
  })
}

export function useCreateDirection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDirectionDto) => settingsApi.createDirection(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.directions() })
      toast.success('Направление создано')
    },
    onError: () => toast.error('Не удалось создать направление'),
  })
}

export function useUpdateDirection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDirectionDto> }) =>
      settingsApi.updateDirection(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.directions() })
      toast.success('Направление обновлено')
    },
    onError: () => toast.error('Не удалось обновить направление'),
  })
}

export function useDeleteDirection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteDirection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.directions() })
      toast.success('Направление удалено')
    },
    onError: () => toast.error('Не удалось удалить направление'),
  })
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export function useSubjects(directionId?: string) {
  return useQuery({
    queryKey: lmsKeys.subjects(directionId),
    queryFn:  () => settingsApi.listSubjects(directionId ? { directionId } : undefined),
    staleTime: 10 * 60_000,
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSubjectDto) => settingsApi.createSubject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'settings', 'subjects'] })
      toast.success('Предмет создан')
    },
    onError: () => toast.error('Не удалось создать предмет'),
  })
}

export function useUpdateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateSubjectDto> }) =>
      settingsApi.updateSubject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'settings', 'subjects'] })
      toast.success('Предмет обновлён')
    },
    onError: () => toast.error('Не удалось обновить предмет'),
  })
}

export function useDeleteSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteSubject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'settings', 'subjects'] })
      toast.success('Предмет удалён')
    },
    onError: () => toast.error('Не удалось удалить предмет'),
  })
}

// ── Rooms ─────────────────────────────────────────────────────────────────────

export function useRooms() {
  return useQuery({
    queryKey: lmsKeys.rooms(),
    queryFn:  () => settingsApi.listRooms(),
    staleTime: 10 * 60_000,
  })
}

export function useCreateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRoomDto) => settingsApi.createRoom(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.rooms() })
      toast.success('Кабинет добавлен')
    },
    onError: () => toast.error('Не удалось добавить кабинет'),
  })
}

export function useUpdateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRoomDto> }) =>
      settingsApi.updateRoom(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.rooms() })
      toast.success('Кабинет обновлён')
    },
    onError: () => toast.error('Не удалось обновить кабинет'),
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteRoom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.rooms() })
      toast.success('Кабинет удалён')
    },
    onError: () => toast.error('Не удалось удалить кабинет'),
  })
}

// ── Users / Teachers ──────────────────────────────────────────────────────────

export function useLmsUsers() {
  return useQuery({
    queryKey: lmsKeys.users(),
    queryFn:  () => settingsApi.listUsers(),
    staleTime: 10 * 60_000,
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: lmsKeys.notifications(),
    queryFn:  () => notificationsApi.list({ limit: 20 }),
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: lmsKeys.notifications() }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: lmsKeys.notifications() }),
  })
}
