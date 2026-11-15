/**
 * api/admin.ts — API client functions for Platform Admin endpoints
 */

import { apiFetch } from './client'
import type { User } from '@/types/auth'
import type { PlatformMetrics, AdminShopsResponse, AdminDisputesResponse } from '@/types/admin'

export type AdminLoginPayload = {
  phone: string
  password: string
}

export async function apiAdminLogin(payload: AdminLoginPayload): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiAdminGetMe(): Promise<User | null> {
  try {
    const data = await apiFetch<{ user: User }>('/api/v1/admin/auth/me')
    return data.user
  } catch {
    return null
  }
}

export async function apiAdminLogout(): Promise<void> {
  await fetch('/api/v1/admin/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}

export async function apiGetAdminMetrics(): Promise<PlatformMetrics> {
  return apiFetch<PlatformMetrics>('/api/v1/admin/metrics')
}

export async function apiGetAdminShops(page = 1, limit = 20, search?: string): Promise<AdminShopsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  if (search && search.trim()) {
    params.set('search', search.trim())
  }
  return apiFetch<AdminShopsResponse>(`/api/v1/admin/shops?${params.toString()}`)
}

export async function apiGetAdminComplaints(page = 1, limit = 20): Promise<AdminDisputesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return apiFetch<AdminDisputesResponse>(`/api/v1/admin/complaints?${params.toString()}`)
}
