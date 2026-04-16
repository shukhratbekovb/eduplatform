import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { compensationApi } from '@/lib/api/lms/compensation'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { SetCompensationDto } from '@/types/lms'

export function useCompensations() {
  return useQuery({
    queryKey: lmsKeys.compensations(),
    queryFn:  () => compensationApi.list(),
    staleTime: 10 * 60_000,
  })
}

export function useTeacherCompensation(teacherId: string) {
  return useQuery({
    queryKey: lmsKeys.compensation(teacherId),
    queryFn:  () => compensationApi.getByTeacher(teacherId),
    enabled:  !!teacherId,
    staleTime: 10 * 60_000,
  })
}

export function useSetCompensation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teacherId, data }: { teacherId: string; data: SetCompensationDto }) =>
      compensationApi.set(teacherId, data),
    onSuccess: (comp) => {
      qc.invalidateQueries({ queryKey: lmsKeys.compensations() })
      qc.setQueryData(lmsKeys.compensation(comp.teacherId), comp)
      toast.success('Модель компенсации сохранена')
    },
    onError: () => toast.error('Не удалось сохранить модель компенсации'),
  })
}

export function useSalaries(period?: string) {
  return useQuery({
    queryKey: lmsKeys.salaries(period),
    queryFn:  () => compensationApi.getSalaries(period ? { period } : undefined),
    staleTime: 5 * 60_000,
  })
}
