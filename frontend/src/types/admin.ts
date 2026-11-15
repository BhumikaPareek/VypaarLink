/**
 * types/admin.ts — Type definitions for Platform Admin Dashboard
 */

export type PlatformMetrics = {
  shops: {
    total: number
    active: number
    inactive: number
  }
  users: {
    totalCustomers: number
    totalShopkeepers: number
    totalUsers: number
  }
  transactions: {
    total: number
    pending: number
    confirmed: number
    flagged: number
  }
}

export type AdminShop = {
  id: string
  name: string
  description: string | null
  address: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    phone: string
    email: string | null
    isActive: boolean
    createdAt: string
  }
  customerCount: number
  transactionCount: number
}

export type AdminDispute = {
  id: string
  amount: string
  type: 'CREDIT' | 'PAYMENT'
  status: 'PENDING' | 'CONFIRMED' | 'FLAGGED'
  note: string | null
  flagReason: string
  flaggedAt: string
  transactionDate: string
  shop: {
    id: string
    name: string
    phone: string | null
  }
  customer: {
    id: string
    name: string
    phone: string
  }
  recordedBy: {
    id: string
    name: string
    phone: string
  }
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type AdminShopsResponse = {
  shops: AdminShop[]
  pagination: PaginationMeta
}

export type AdminDisputesResponse = {
  complaints: AdminDispute[]
  disputes: AdminDispute[]
  pagination: PaginationMeta
}
