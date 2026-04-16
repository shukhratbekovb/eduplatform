import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groupsApi } from '@/lib/api/lms/groups'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { CreateGroupDto, EnrollStudentDto } from '@/types/lms'

export function useGroups(params?: Record<string, string>) {
  return useQuery({
    queryKey: lmsKeys.groups(params),
    queryFn:  () => groupsApi.list(params),
    staleTime: 5 * 60_000,
  })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: lmsKeys.group(id),
    queryFn:  () => groupsApi.get(id),
    enabled:  !!id,
  })
}

export function useGroupStudents(id: string) {
  return useQuery({
    queryKey: [...lmsKeys.group(id), 'students'],
    queryFn:  () => groupsApi.getStudents(id),
    enabled:  !!id,
  })
}

export function useGroupLessons(id: string, params?: Record<string, string>) {
  return useQuery({
    queryKey: lmsKeys.groupLessons(id),
    queryFn:  () => groupsApi.getLessons(id, params),
    enabled:  !!id,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupDto) => groupsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.groups() })
      toast.success('Группа создана')
    },
    onError: () => toast.error('Не удалось создать группу'),
  })
}

export function useUpdateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGroupDto> }) =>
      groupsApi.update(id, data),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: lmsKeys.groups() })
      qc.setQueryData(lmsKeys.group(group.id), group)
      toast.success('Группа обновлена')
    },
    onError: () => toast.error('Не удалось обновить группу'),
  })
}

export function useArchiveGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => groupsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.groups() })
      toast.success('Группа архивирована')
    },
    onError: () => toast.error('Не удалось архивировать группу'),
  })
}

export function useEnrollStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EnrollStudentDto) => groupsApi.enroll(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: lmsKeys.groups() })
      qc.invalidateQueries({ queryKey: [...lmsKeys.group(vars.groupId), 'students'] })
      toast.success('Студент зачислен в группу')
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error('Конфликт расписания — группы пересекаются')
      } else {
        toast.error('Не удалось зачислить студента')
      }
    },
  })
}
