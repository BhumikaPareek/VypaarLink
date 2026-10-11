import { useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordPaymentModal } from '@/features/transactions/RecordPaymentModal';
import { apiGetTransactions } from '@/api/transactions';
import { apiGetDashboard } from '@/api/dashboard';
import { formatCurrency, formatDateTime } from '@/utils/format';

export function PaymentsPage() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: apiGetDashboard,
  });

  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions', 'PAYMENT'],
    queryFn: () => apiGetTransactions({ type: 'PAYMENT', limit: 50 }),
  });

  const payments = txData?.transactions || [];

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <Button onClick={() => setIsOpen(true)}>Record Payment</Button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col max-w-md">
        <span className="text-sm font-medium text-gray-500 mb-2">Total Payments Received</span>
        <span className="text-3xl font-bold text-green-600">
          {dashboard ? formatCurrency(dashboard.totalPaymentsReceived) : '₹0.00'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Payments</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading payments...</div>
        ) : payments.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title="No payments yet"
            description="Record a payment when a customer pays their balance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Note</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.customerName || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{tx.note || '—'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600 whitespace-nowrap">
                      {formatCurrency(tx.amount)}
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

      <RecordPaymentModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
