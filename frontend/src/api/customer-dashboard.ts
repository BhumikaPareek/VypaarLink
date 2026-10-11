import type { Transaction } from '@/types/transaction'
import { apiFetch } from './client'

export type CustomerDashboardData = {
  totalOutstanding: string;
  connectedShopsCount: number;
  pendingConfirmations: number;
  shops: Array<{
    shopId: string;
    shopName: string;
    outstandingBalance: string;
    joinedAt: string;
  }>;
  recentTransactions: Array<Transaction & { shop?: { id: string; name: string } }>;
}

export async function apiGetCustomerDashboard(): Promise<CustomerDashboardData> {
  return apiFetch<CustomerDashboardData>('/api/v1/dashboard/customer')
}
