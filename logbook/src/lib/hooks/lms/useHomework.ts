import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { homeworkApi } from '@/lib/api/lms/homework'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { CreateHomeworkDto, ReviewHomeworkDto, HomeworkFilters } from '@/types/lms'

export function useHomeworkSubmissions(filters?: HomeworkFilters) {
  const params = filters
    ? Object.fromEntries(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      )
    : undefined
  return useQuery({
    queryKey: lmsKeys.homework(params),
    queryFn:  () => homeworkApi.listSubmissions(params),
  })
}

export function useCreateHomework() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateHomeworkDto) => homeworkApi.createAssignment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'homework'] })
      toast.success('Домашнее задание назначено')
    },
    onError: () => toast.error('Не удалось назначить ДЗ'),
  })
}

export function useReviewHomework() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewHomeworkDto }) =>
      homeworkApi.review(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'homework'] })
      toast.success('Работа проверена')
    },
    onError: () => toast.error('Не удалось сохранить оценку'),
  })
}
