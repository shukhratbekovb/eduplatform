import { z } from 'zod'

export const taskSchema = z.object({
  title:        z.string().min(1, 'Название обязательно').max(100),
  description:  z.string().max(500).optional(),
  linkedLeadId: z.string().optional(),
  assignedTo:   z.string().min(1, 'Назначьте менеджера'),
  dueDate:      z.string().min(1, 'Укажите дату'),
  priority:     z.enum(['low', 'medium', 'high', 'critical']),
  reminderAt:   z.string().optional(),
})

export type TaskFormValues = z.infer<typeof taskSchema>
