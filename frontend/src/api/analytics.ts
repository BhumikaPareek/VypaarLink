import type {
  AnalyticsFilter,
  AnalyticsOverview,
  CreditAgingData,
  CashflowData,
  InventoryInsightsData,
  SupplierInsightsData,
} from '@/types/analytics'
import { apiFetch } from './client'

const BASE = '/api/v1/analytics'

function buildQueryString(filter?: AnalyticsFilter): string {
  if (!filter) return ''
  const params = new URLSearchParams()
  if (filter.range) params.set('range', filter.range)
  if (filter.startDate) params.set('startDate', filter.startDate)
  if (filter.endDate) params.set('endDate', filter.endDate)
  if (filter.groupBy) params.set('groupBy', filter.groupBy)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function apiGetAnalyticsOverview(filter?: AnalyticsFilter): Promise<AnalyticsOverview> {
  return apiFetch<AnalyticsOverview>(`${BASE}/overview${buildQueryString(filter)}`)
}

export async function apiGetCreditAging(): Promise<CreditAgingData> {
  return apiFetch<CreditAgingData>(`${BASE}/credit-aging`)
}

export async function apiGetCashflow(filter?: AnalyticsFilter): Promise<CashflowData> {
  return apiFetch<CashflowData>(`${BASE}/cashflow${buildQueryString(filter)}`)
}

export async function apiGetInventoryInsights(filter?: AnalyticsFilter): Promise<InventoryInsightsData> {
  return apiFetch<InventoryInsightsData>(`${BASE}/inventory-insights${buildQueryString(filter)}`)
}

export async function apiGetSupplierInsights(filter?: AnalyticsFilter): Promise<SupplierInsightsData> {
  return apiFetch<SupplierInsightsData>(`${BASE}/suppliers${buildQueryString(filter)}`)
}
