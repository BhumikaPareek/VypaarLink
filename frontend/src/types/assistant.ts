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

export type AssistantSuggestionCategory = {
  category: string
  questions: string[]
}

export type AssistantSuggestionsResponse = {
  categories: AssistantSuggestionCategory[]
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  timestamp: string
  content?: string
  data?: AssistantResponseData
  error?: string
  failedQuestion?: string
}
