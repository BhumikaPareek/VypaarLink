import type {
  AssistantResponseData,
  AssistantSuggestionsResponse,
} from '@/types/assistant'
import { apiFetch } from './client'

const BASE = '/api/v1/assistant'

export async function apiAskAssistant(question: string): Promise<AssistantResponseData> {
  return apiFetch<AssistantResponseData>(`${BASE}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}

export async function apiGetAssistantSuggestions(): Promise<AssistantSuggestionsResponse> {
  return apiFetch<AssistantSuggestionsResponse>(`${BASE}/suggestions`)
}
