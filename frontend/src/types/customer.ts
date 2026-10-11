import type { Transaction } from './transaction'

export type CustomerSummary = {
  shopCustomerId: string
  customerId: string
  name: string
  phone: string
  email: string | null
  outstandingBalance: string
  lastTransactionAt: string | null
  joinedAt: string
}

export type CustomerDetail = {
  shopCustomerId: string
  customer: {
    id: string
    name: string
    phone: string
    email: string | null
    role: string
    createdAt: string
  }
  outstandingBalance: string
  totalCredit: string
  totalPayments: string
  transactions: Transaction[]
}
