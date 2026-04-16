import { z } from 'zod'

export const createGroupSchema = z.object({
  name:        z.string().min(2, 'Минимум 2 символа').max(100),
  directionId: z.string().min(1, 'Выберите направление'),
  subjectId:   z.string().min(1, 'Выберите предмет'),
  teacherId:   z.string().min(1, 'Выберите преподавателя'),
  startDate:   z.string().min(1, 'Выберите дату начала'),
  endDate:     z.string().min(1, 'Выберите дату окончания'),
}).refine((v) => v.startDate < v.endDate, {
  message: 'Дата окончания должна быть позже даты начала',
  path: ['endDate'],
})

export type CreateGroupValues = z.infer<typeof createGroupSchema>
