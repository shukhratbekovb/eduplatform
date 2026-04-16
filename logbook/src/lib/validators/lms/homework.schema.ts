import { z } from 'zod'

export const createHomeworkSchema = z.object({
  lessonId:    z.string().min(1),
  title:       z.string().min(2, 'Минимум 2 символа').max(200),
  description: z.string().max(500).optional(),
  dueDate:     z.string().min(1, 'Выберите срок сдачи'),
})

export const reviewHomeworkSchema = z.object({
  grade:    z.number().min(1).max(10),
  feedback: z.string().min(5, 'Добавьте развёрнутый отзыв').max(500),
})

export type CreateHomeworkValues = z.infer<typeof createHomeworkSchema>
export type ReviewHomeworkValues = z.infer<typeof reviewHomeworkSchema>
