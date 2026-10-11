import type { Shop } from '@/types/shop'
import { apiFetch } from './client'

const BASE = '/api/v1/shop'

export async function apiGetMyShop(): Promise<{ shop: Shop | null }> {
  try {
    return await apiFetch<{ shop: Shop | null }>(`${BASE}/me`)
  } catch {
    return { shop: null }
  }
}

export async function apiSetupShop(data: { name: string; description?: string; address?: string; phone?: string }): Promise<{ shop: Shop }> {
  return apiFetch<{ shop: Shop }>(`${BASE}/setup`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiUpdateShop(data: Partial<{ name: string; description: string; address: string; phone: string }>): Promise<{ shop: Shop }> {
  return apiFetch<{ shop: Shop }>(`${BASE}/me`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}
