import { useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { AddCustomerModal } from '@/features/customers/AddCustomerModal';
import { RecordCreditModal } from '@/features/transactions/RecordCreditModal';
import { RecordPaymentModal } from '@/features/transactions/RecordPaymentModal';
import { apiGetDashboard } from '@/api/dashboard';
import { formatCurrency, formatDateTime } from '@/utils/format';

export function ShopkeeperDashboard() {
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isRecordCreditOpen, setIsRecordCreditOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiGetDashboard,
  });

  if (isLoading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (!data) return null;

  const hasTransactions = data.recentTransactions.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Business Overview</h1>
          <p className="text-text-muted text-sm mt-1">Manage your customers and track your daily ledgers.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => setIsAddCustomerOpen(true)} className="flex-1 sm:flex-none justify-center">Add Customer</Button>
          <Button variant="secondary" onClick={() => setIsRecordCreditOpen(true)} className="flex-1 sm:flex-none justify-center">Credit</Button>
          <Button onClick={() => setIsRecordPaymentOpen(true)} className="flex-1 sm:flex-none justify-center">Payment</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          label="Total Customers" 
          value={data.totalCustomers} 
          accent="neutral" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <StatCard 
          label="Outstanding Credit" 
          value={formatCurrency(data.totalOutstanding)} 
          accent="prominent" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
          label="Payments Received" 
          value={formatCurrency(data.totalPaymentsReceived)} 
          accent="positive" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
          label="Pending Confirmations" 
          value={data.quickStats.pendingCount} 
          sublabel="Waiting for customer action" 
          accent="warning" 
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="bg-surface rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Transactions</h2>
        </div>
        
        {!hasTransactions ? (
          <EmptyState 
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
            title="No transactions yet"
            description="Record a credit or payment to get started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.customerName || 'Unknown'}</td>
                    <td className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-red-600' : 'text-primary'}`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tx.type === 'CREDIT' ? 'danger' : 'success'} label={tx.type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tx.status === 'PENDING' ? 'warning' : tx.status === 'CONFIRMED' ? 'success' : 'danger'} label={tx.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCustomerModal isOpen={isAddCustomerOpen} onClose={() => setIsAddCustomerOpen(false)} />
      <RecordCreditModal isOpen={isRecordCreditOpen} onClose={() => setIsRecordCreditOpen(false)} />
      <RecordPaymentModal isOpen={isRecordPaymentOpen} onClose={() => setIsRecordPaymentOpen(false)} />
    </div>
  );
}
