import { z } from 'zod'

export const createStudentSchema = z.object({
  fullName:    z.string().min(2, 'Минимум 2 символа').max(100),
  phone:       z.string().optional(),
  email:       z.string().email('Некорректный email').optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
  parentName:  z.string().max(100).optional(),
  parentPhone: z.string().optional(),
})

export type CreateStudentValues = z.infer<typeof createStudentSchema>
