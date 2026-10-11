import type { DashboardData } from '@/types/transaction'
import { apiFetch } from './client'

const BASE = '/api/v1/dashboard'

export async function apiGetDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>(BASE)
}
