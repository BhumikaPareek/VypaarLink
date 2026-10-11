import type { Shop } from './shop'

export type TransactionType = 'CREDIT' | 'PAYMENT'
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FLAGGED'

export type Transaction = {
  id: string
  shopId: string
  customerId: string
  amount: string
  type: TransactionType
  status: TransactionStatus
  note: string | null
  recordedById: string
  confirmedAt: string | null
  flaggedAt: string | null
  flagReason: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  transactionDate: string
  dueDate: string | null
  paymentMethod: string | null
  reference: string | null
  customerName?: string
  customerPhone?: string
  recordedBy?: {
    id: string
    name: string
  }
}

export type DashboardData = {
  shop: Shop | null
  totalCustomers: number
  totalOutstanding: string
  totalCreditGiven: string
  totalPaymentsReceived: string
  recentTransactions: Transaction[]
  quickStats: {
    confirmedCount: number
    pendingCount: number
    flaggedCount: number
  }
}
