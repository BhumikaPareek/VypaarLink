import { z } from 'zod'

export const askAssistantSchema = z.object({
  question: z
    .string({ required_error: 'Question is required' })
    .trim()
    .min(2, 'Question must be at least 2 characters long')
    .max(500, 'Question cannot exceed 500 characters'),
})

export type AskAssistantInput = z.infer<typeof askAssistantSchema>

export type AssistantMetric = {
  label: string
  value: string
  accent?: 'neutral' | 'prominent' | 'positive' | 'warning' | 'danger'
}

export type AssistantDetailItem = {
  title: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'neutral' | 'info' | 'warning' | 'success' | 'danger'
  amount?: string
  link?: string
}

export type AssistantDetails = {
  type: 'debtor_list' | 'product_list' | 'supplier_list' | 'metric_summary' | 'po_list'
  items: AssistantDetailItem[]
}

export type AssistantActionLink = {
  label: string
  path: string
}

export type AssistantResponseData = {
  question: string
  intent: string
  period: {
    label: string
    startDate: string | null
    endDate: string
  }
  answer: string
  metrics?: AssistantMetric[]
  details?: AssistantDetails
  suggestedActions?: AssistantActionLink[]
  suggestedQuestions?: string[]
}
