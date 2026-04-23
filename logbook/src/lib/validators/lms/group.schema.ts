import { z } from 'zod'

export const createGroupSchema = z.object({
  name:        z.string().min(2, 'Минимум 2 символа').max(100),
  directionId: z.string().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
}).refine((v) => {
  if (v.startDate && v.endDate) return v.startDate < v.endDate
  return true
}, {
  message: 'Дата окончания должна быть позже даты начала',
  path: ['endDate'],
})

export type CreateGroupValues = z.infer<typeof createGroupSchema>
