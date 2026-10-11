import { useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiGetTransactions } from '@/api/transactions';
import { formatCurrency, formatDateTime } from '@/utils/format';

export function TransactionsPage() {
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', type],
    queryFn: () => apiGetTransactions({ type: type || undefined, limit: 100 }),
  });

  const transactions = data?.transactions || [];
  const filtered = transactions.filter(t => 
    t.note?.toLowerCase().includes(search.toLowerCase()) || 
    t.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>

      <div className="flex gap-4 items-end bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <Select
          label="Filter by Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={[
            { value: '', label: 'All Transactions' },
            { value: 'CREDIT', label: 'Credit Only' },
            { value: 'PAYMENT', label: 'Payment Only' },
          ]}
          className="w-48"
        />
        <div className="flex-1">
          <Input
            placeholder="Search by note or customer name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading transactions...</div>
        ) : filtered.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            title="No transactions found"
            description="Adjust your filters or record a new transaction."
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
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.customerName || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{tx.note || '—'}</td>
                    <td className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-red-600' : 'text-green-600'}`}>
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
    </div>
  );
}
