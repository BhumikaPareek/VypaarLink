import type {
  Supplier,
  SupplierStats,
  PurchaseOrder,
  SupplierPaymentMethod,
} from '@/types/supplier'
import { apiFetch } from './client'

const SUPPLIERS_BASE = '/api/v1/suppliers'
const PO_BASE = '/api/v1/purchase-orders'

// ── Supplier API ─────────────────────────────────────────────────────────────

export async function apiGetSupplierStats(): Promise<SupplierStats> {
  return apiFetch<SupplierStats>(`${SUPPLIERS_BASE}/stats`)
}

export async function apiGetSuppliers(params?: {
  search?: string
  isActive?: boolean
}): Promise<{ suppliers: Supplier[] }> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.append('search', params.search)
  if (params?.isActive !== undefined) searchParams.append('isActive', String(params.isActive))
  const query = searchParams.toString()
  return apiFetch<{ suppliers: Supplier[] }>(`${SUPPLIERS_BASE}${query ? `?${query}` : ''}`)
}

export async function apiGetSupplier(id: string): Promise<{ supplier: Supplier & { purchaseOrders: PurchaseOrder[]; payments: any[] } }> {
  return apiFetch<{ supplier: Supplier & { purchaseOrders: PurchaseOrder[]; payments: any[] } }>(`${SUPPLIERS_BASE}/${id}`)
}

export async function apiCreateSupplier(data: {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  gstin?: string
  notes?: string
}): Promise<{ supplier: Supplier }> {
  return apiFetch<{ supplier: Supplier }>(SUPPLIERS_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiUpdateSupplier(
  id: string,
  data: {
    name?: string
    contactPerson?: string | null
    phone?: string | null
    email?: string | null
    address?: string | null
    gstin?: string | null
    notes?: string | null
  }
): Promise<{ supplier: Supplier }> {
  return apiFetch<{ supplier: Supplier }>(`${SUPPLIERS_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function apiArchiveSupplier(id: string): Promise<{ supplier: Supplier }> {
  return apiFetch<{ supplier: Supplier }>(`${SUPPLIERS_BASE}/${id}/archive`, {
    method: 'PATCH',
  })
}

export async function apiRestoreSupplier(id: string): Promise<{ supplier: Supplier }> {
  return apiFetch<{ supplier: Supplier }>(`${SUPPLIERS_BASE}/${id}/restore`, {
    method: 'PATCH',
  })
}

// ── Purchase Order API ───────────────────────────────────────────────────────

export async function apiGetPurchaseOrders(params?: {
  supplierId?: string
  status?: string
  search?: string
}): Promise<{ purchaseOrders: PurchaseOrder[] }> {
  const searchParams = new URLSearchParams()
  if (params?.supplierId) searchParams.append('supplierId', params.supplierId)
  if (params?.status) searchParams.append('status', params.status)
  if (params?.search) searchParams.append('search', params.search)
  const query = searchParams.toString()
  return apiFetch<{ purchaseOrders: PurchaseOrder[] }>(`${PO_BASE}${query ? `?${query}` : ''}`)
}

export async function apiGetPurchaseOrder(id: string): Promise<{ purchaseOrder: PurchaseOrder }> {
  return apiFetch<{ purchaseOrder: PurchaseOrder }>(`${PO_BASE}/${id}`)
}

export async function apiCreatePurchaseOrder(data: {
  supplierId: string
  orderDate?: string
  expectedDate?: string | null
  notes?: string
  items: Array<{ productId: string; quantityOrdered: number; unitCost: number }>
}): Promise<{ purchaseOrder: PurchaseOrder }> {
  return apiFetch<{ purchaseOrder: PurchaseOrder }>(PO_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiUpdatePurchaseOrder(
  id: string,
  data: {
    expectedDate?: string | null
    notes?: string
    items?: Array<{ productId: string; quantityOrdered: number; unitCost: number }>
  }
): Promise<{ purchaseOrder: PurchaseOrder }> {
  return apiFetch<{ purchaseOrder: PurchaseOrder }>(`${PO_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function apiPlacePurchaseOrder(id: string): Promise<{ purchaseOrder: PurchaseOrder }> {
  return apiFetch<{ purchaseOrder: PurchaseOrder }>(`${PO_BASE}/${id}/place`, {
    method: 'POST',
  })
}

export async function apiCancelPurchaseOrder(id: string): Promise<{ purchaseOrder: PurchaseOrder }> {
  return apiFetch<{ purchaseOrder: PurchaseOrder }>(`${PO_BASE}/${id}/cancel`, {
    method: 'POST',
  })
}

export async function apiRecordGoodsReceipt(
  orderId: string,
  data: {
    receivedDate?: string
    notes?: string
    items: Array<{ purchaseOrderItemId: string; quantityReceived: number }>
  }
): Promise<{ receipt: any }> {
  return apiFetch<{ receipt: any }>(`${PO_BASE}/${orderId}/receipts`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function apiRecordSupplierPayment(
  orderId: string,
  data: {
    amount: number
    paymentDate?: string
    paymentMethod: SupplierPaymentMethod
    reference?: string
    notes?: string
  }
): Promise<{ payment: any }> {
  return apiFetch<{ payment: any }>(`${PO_BASE}/${orderId}/payments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
