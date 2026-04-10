import { z } from 'zod'

export const leadSchema = z.object({
  fullName:   z.string().min(2, 'Минимум 2 символа').max(100),
  phone:      z.string().min(9, 'Некорректный номер телефона'),
  email:      z.string().email('Некорректный email').optional().or(z.literal('')),
  sourceId:   z.string().min(1, 'Выберите источник'),
  funnelId:   z.string().min(1, 'Выберите воронку'),
  stageId:    z.string().min(1, 'Выберите этап'),
  assignedTo: z.string().min(1, 'Назначьте менеджера'),
  customFields: z.record(z.any()).optional(),
})

export const markLostSchema = z.object({
  reason: z.string().min(1, 'Укажите причину'),
})

export type LeadFormValues = z.infer<typeof leadSchema>
export type MarkLostValues = z.infer<typeof markLostSchema>
