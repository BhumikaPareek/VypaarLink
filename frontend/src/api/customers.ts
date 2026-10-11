import type { CustomerSummary, CustomerDetail } from '@/types/customer'
import { apiFetch } from './client'

const BASE = '/api/v1/customers'

export async function apiGetCustomers(): Promise<{ customers: CustomerSummary[] }> {
  return apiFetch<{ customers: CustomerSummary[] }>(BASE)
}

export async function apiAddCustomer(data: { name: string; phone: string }): Promise<{ customer: CustomerSummary }> {
  return apiFetch<{ customer: CustomerSummary }>(BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiGetCustomer(customerId: string): Promise<{ customer: CustomerDetail }> {
  return apiFetch<{ customer: CustomerDetail }>(`${BASE}/${customerId}`)
}

export async function apiUpdateCustomer(customerId: string, data: { name?: string }): Promise<{ customer: CustomerSummary }> {
  return apiFetch<{ customer: CustomerSummary }>(`${BASE}/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function apiRemoveCustomer(customerId: string): Promise<void> {
  await fetch(`${BASE}/${customerId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}
