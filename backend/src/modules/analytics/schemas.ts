import { z } from 'zod'

export const analyticsQuerySchema = z
  .object({
    range: z.enum(['7d', '30d', 'month', 'all', 'custom']).default('30d'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    groupBy: z.enum(['day', 'week', 'month']).optional(),
  })
  .refine(
    (data) => {
      if (data.range === 'custom') {
        if (!data.startDate || !data.endDate) return false
        const start = new Date(data.startDate)
        const end = new Date(data.endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
        if (start > end) return false
      }
      return true
    },
    {
      message:
        'For custom range, valid startDate and endDate are required, and startDate must be before or equal to endDate',
    }
  )

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>
