import { z } from 'zod'

export const funnelSchema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(50),
})

export const stageSchema = z.object({
  name:            z.string().min(1, 'Название обязательно').max(50),
  color:           z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Некорректный цвет'),
  winProbability:  z.number().min(0).max(100),
})

export const customFieldSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'),      label: z.string().min(1).max(50) }),
  z.object({ type: z.literal('number'),    label: z.string().min(1).max(50) }),
  z.object({ type: z.literal('date'),      label: z.string().min(1).max(50) }),
  z.object({ type: z.literal('checkbox'),  label: z.string().min(1).max(50) }),
  z.object({
    type:    z.enum(['select', 'multiselect']),
    label:   z.string().min(1).max(50),
    options: z.array(z.string().min(1)).min(1, 'Добавьте хотя бы один вариант'),
  }),
])

export type FunnelFormValues      = z.infer<typeof funnelSchema>
export type StageFormValues       = z.infer<typeof stageSchema>
export type CustomFieldFormValues = z.infer<typeof customFieldSchema>
