import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { studentsApi } from '@/lib/api/lms/students'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { CreateStudentDto, UpdateStudentDto, StudentFilters } from '@/types/lms'

export function useStudents(filters?: StudentFilters) {
  const params = filters
    ? Object.fromEntries(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: lmsKeys.students(params),
    queryFn:  () => studentsApi.list(params),
    staleTime: 2 * 60_000,
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: lmsKeys.student(id),
    queryFn:  () => studentsApi.get(id),
    enabled:  !!id,
  })
}

export function useStudentRisk(id: string) {
  return useQuery({
    queryKey: lmsKeys.studentRisk(id),
    queryFn:  () => studentsApi.getRisk(id),
    enabled:  !!id,
    staleTime: 60 * 60_000, // risk updated nightly, cache for 1 hour
  })
}

export function useStudentCoins(id: string) {
  return useQuery({
    queryKey: lmsKeys.studentCoins(id),
    queryFn:  () => studentsApi.getCoins(id),
    enabled:  !!id,
  })
}

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateStudentDto) => studentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lmsKeys.students() })
      toast.success('Студент добавлен')
    },
    onError: () => toast.error('Не удалось добавить студента'),
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStudentDto }) =>
      studentsApi.update(id, data),
    onSuccess: (student) => {
      qc.invalidateQueries({ queryKey: lmsKeys.students() })
      qc.setQueryData(lmsKeys.student(student.id), student)
      toast.success('Данные студента обновлены')
    },
    onError: () => toast.error('Не удалось обновить данные'),
  })
}

export function useTeachers() {
  return useQuery({
    queryKey: lmsKeys.users(),
    queryFn:  () => studentsApi.getTeachers(),
    staleTime: 10 * 60_000,
  })
}
