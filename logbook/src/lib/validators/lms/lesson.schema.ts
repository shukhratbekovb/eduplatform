import { z } from 'zod'

export const createLessonSchema = z.object({
  groupId:   z.string().min(1, 'Выберите группу'),
  roomId:    z.string().optional(),
  date:      z.string().min(1, 'Выберите дату'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Формат HH:mm'),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Формат HH:mm'),
  topic:     z.string().max(200).optional(),
}).refine((v) => v.startTime < v.endTime, {
  message: 'Время начала должно быть раньше времени окончания',
  path: ['endTime'],
})

export const bulkCreateSchema = z.object({
  groupId:   z.string().min(1, 'Выберите группу'),
  roomId:    z.string().optional(),
  startDate: z.string().min(1, 'Выберите дату начала'),
  endDate:   z.string().min(1, 'Выберите дату окончания'),
  weekdays:  z.array(z.number().min(1).max(7)).min(1, 'Выберите хотя бы один день'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Формат HH:mm'),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Формат HH:mm'),
})

export const conductLessonSchema = z.object({
  topic: z.string().min(1, 'Укажите тему урока').max(200),
  attendance: z.array(z.object({
    studentId: z.string(),
    status:    z.enum(['on_time', 'late', 'absent']),
    note:      z.string().optional(),
  })),
  grades: z.array(z.object({
    studentId: z.string(),
    grade:     z.number().min(1).max(10),
    comment:   z.string().optional(),
  })).superRefine((grades, ctx) => {
    grades.forEach((g, i) => {
      if (g.grade < 6 && (!g.comment || g.comment.trim().length < 5)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Для оценки ниже 6 необходим комментарий (мин. 5 символов)',
          path: [i, 'comment'],
        })
      }
    })
  }),
  diamonds: z.array(z.object({
    studentId: z.string(),
    diamonds:  z.number().min(1).max(3),
  })),
})

export type CreateLessonValues  = z.infer<typeof createLessonSchema>
export type BulkCreateValues    = z.infer<typeof bulkCreateSchema>
export type ConductLessonValues = z.infer<typeof conductLessonSchema>
