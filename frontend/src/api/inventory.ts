import type { Product, StockMovement, InventoryStats } from '@/types/inventory'
import { apiFetch } from './client'

const BASE = '/api/v1/inventory'

export async function apiGetInventoryStats(): Promise<InventoryStats> {
  return apiFetch<InventoryStats>(`${BASE}/stats`)
}

export async function apiGetProducts(params?: {
  search?: string
  category?: string
  stockStatus?: 'low' | 'out' | 'all'
  isActive?: boolean
}): Promise<{ products: Product[] }> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.append('search', params.search)
  if (params?.category) searchParams.append('category', params.category)
  if (params?.stockStatus) searchParams.append('stockStatus', params.stockStatus)
  if (params?.isActive !== undefined) searchParams.append('isActive', String(params.isActive))
  const query = searchParams.toString()
  return apiFetch<{ products: Product[] }>(`${BASE}${query ? `?${query}` : ''}`)
}

export async function apiGetProduct(id: string): Promise<{ product: Product & { movements: StockMovement[] } }> {
  return apiFetch<{ product: Product & { movements: StockMovement[] } }>(`${BASE}/${id}`)
}

export async function apiCreateProduct(data: {
  name: string
  sku?: string
  category?: string
  price: number
  quantity: number
  unit: string
  lowStockThreshold: number
}): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`${BASE}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiUpdateProduct(
  id: string,
  data: {
    name?: string
    sku?: string | null
    category?: string | null
    price?: number
    unit?: string
    lowStockThreshold?: number
  }
): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function apiArchiveProduct(id: string): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`${BASE}/${id}/archive`, {
    method: 'PATCH',
  })
}

export async function apiRestoreProduct(id: string): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`${BASE}/${id}/restore`, {
    method: 'PATCH',
  })
}

export async function apiAdjustStock(
  id: string,
  data: { type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'; quantity: number; note?: string }
): Promise<{ product: Product }> {
  return apiFetch<{ product: Product }>(`${BASE}/${id}/stock`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiGetStockMovements(id: string): Promise<{ movements: StockMovement[] }> {
  return apiFetch<{ movements: StockMovement[] }>(`${BASE}/${id}/movements`)
}
