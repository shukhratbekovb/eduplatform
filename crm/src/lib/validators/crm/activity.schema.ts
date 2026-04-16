import { z } from 'zod'

export const activitySchema = z.object({
  type:            z.enum(['call', 'meeting', 'message', 'other']),
  date:            z.string().min(1, 'Укажите дату'),
  outcome:         z.string().min(1, 'Укажите исход'),
  notes:           z.string().optional(),
  durationMinutes: z.preprocess(
    (v) => (v === '' || v === undefined || v === null || Number.isNaN(v) ? undefined : Number(v)),
    z.number().min(1).optional(),
  ),
  channel:         z.string().optional(),
  needsFollowUp:   z.boolean(),
})

export type ActivityFormValues = z.infer<typeof activitySchema>
