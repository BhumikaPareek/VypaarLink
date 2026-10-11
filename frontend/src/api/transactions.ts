import type { Transaction } from '@/types/transaction'
import { apiFetch } from './client'

const BASE = '/api/v1/transactions'

export async function apiGetTransactions(params?: { customerId?: string; type?: string; page?: number; limit?: number }): Promise<{ transactions: Transaction[]; total: number; page: number }> {
  const searchParams = new URLSearchParams()
  if (params?.customerId) searchParams.append('customerId', params.customerId)
  if (params?.type) searchParams.append('type', params.type)
  if (params?.page) searchParams.append('page', params.page.toString())
  if (params?.limit) searchParams.append('limit', params.limit.toString())

  const query = searchParams.toString()
  return apiFetch<{ transactions: Transaction[]; total: number; page: number }>(`${BASE}${query ? `?${query}` : ''}`)
}

export async function apiCreateCredit(data: {
  customerId: string
  amount: string | number
  note?: string
  transactionDate?: string
  dueDate?: string
  items?: Array<{ productId: string; quantity: number }>
}): Promise<{ transaction: Transaction }> {
  return apiFetch<{ transaction: Transaction }>(`${BASE}/credit`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiCreatePayment(data: { customerId: string; amount: string | number; note?: string; transactionDate?: string; paymentMethod?: string; reference?: string }): Promise<{ transaction: Transaction }> {
  return apiFetch<{ transaction: Transaction }>(`${BASE}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiGetCustomerTransactions(customerId: string): Promise<{ transactions: Transaction[] }> {
  return apiFetch<{ transactions: Transaction[] }>(`${BASE}/customer/${customerId}`)
}

export async function apiConfirmTransaction(id: string): Promise<{ transaction: Transaction }> {
  return apiFetch<{ transaction: Transaction }>(`${BASE}/${id}/confirm`, {
    method: 'PATCH',
  })
}

export async function apiFlagTransaction(id: string, flagReason: string): Promise<{ transaction: Transaction }> {
  return apiFetch<{ transaction: Transaction }>(`${BASE}/${id}/flag`, {
    method: 'PATCH',
    body: JSON.stringify({ flagReason }),
  })
}

export async function apiGetMyTransactions(shopId: string, params?: { type?: string }): Promise<{ transactions: Transaction[] }> {
  const searchParams = new URLSearchParams()
  if (params?.type) searchParams.append('type', params.type)
  const query = searchParams.toString()
  return apiFetch<{ transactions: Transaction[] }>(`${BASE}/my/${shopId}${query ? `?${query}` : ''}`)
}
