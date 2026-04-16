import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { scheduleApi } from '@/lib/api/lms/schedule'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import { toIsoDate, getWeekDays } from '@/lib/utils/dates'
import type { CreateLessonDto, BulkCreateLessonsDto, ConductLessonDto, UpdateLessonDto } from '@/types/lms'
import { addDays, parseISO } from 'date-fns'

export function useSchedule(weekStart: string, filters?: Record<string, string>) {
  const weekEnd = toIsoDate(addDays(parseISO(weekStart), 6))
  return useQuery({
    queryKey: lmsKeys.schedule({ weekStart, weekEnd, ...filters }),
    queryFn:  () => scheduleApi.list({ weekStart, weekEnd, ...filters }),
    staleTime: 2 * 60_000,
  })
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: lmsKeys.lesson(id),
    queryFn:  () => scheduleApi.get(id),
    enabled:  !!id,
  })
}

export function useLessonFull(id: string) {
  return useQuery({
    queryKey: lmsKeys.lessonData(id),
    queryFn:  () => scheduleApi.getFull(id),
    enabled:  !!id,
  })
}

export function useCreateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLessonDto) => scheduleApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'schedule'] })
      toast.success('Урок создан')
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error('Конфликт расписания — проверьте время')
      } else {
        toast.error('Не удалось создать урок')
      }
    },
  })
}

export function useCreateBulkLessons() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkCreateLessonsDto) => scheduleApi.createBulk(data),
    onSuccess: (lessons) => {
      qc.invalidateQueries({ queryKey: ['lms', 'schedule'] })
      toast.success(`Создано ${(lessons as any[]).length} уроков`)
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error('Конфликты расписания — некоторые уроки не созданы')
      } else {
        toast.error('Не удалось создать расписание')
      }
    },
  })
}

export function useUpdateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLessonDto }) =>
      scheduleApi.update(id, data),
    onSuccess: (lesson) => {
      qc.invalidateQueries({ queryKey: ['lms', 'schedule'] })
      qc.setQueryData(lmsKeys.lesson(lesson.id), lesson)
      toast.success('Урок обновлён')
    },
    onError: () => toast.error('Не удалось обновить урок'),
  })
}

export function useCancelLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      scheduleApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'schedule'] })
      toast.success('Урок отменён')
    },
    onError: () => toast.error('Не удалось отменить урок'),
  })
}

export function useConductLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConductLessonDto }) =>
      scheduleApi.conduct(id, data),
    onSuccess: (lesson) => {
      qc.invalidateQueries({ queryKey: ['lms', 'schedule'] })
      qc.invalidateQueries({ queryKey: lmsKeys.lessonData(lesson.id) })
      qc.setQueryData(lmsKeys.lesson(lesson.id), lesson)
      toast.success('Урок проведён. Данные сохранены!')
    },
    onError: (err: any) => {
      if (err?.response?.status === 403) {
        toast.error('Время ввода данных истекло. Подайте запрос на позднее внесение.')
      } else {
        toast.error('Не удалось сохранить данные урока')
      }
    },
  })
}
