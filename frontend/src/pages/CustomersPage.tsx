import { useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddCustomerModal } from '@/features/customers/AddCustomerModal';
import { apiGetCustomers } from '@/api/customers';
import { formatCurrency, formatDate } from '@/utils/format';

export function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: apiGetCustomers,
  });

  const customers = data?.customers || [];
  
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Button onClick={() => setIsAddOpen(true)}>Add Customer</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <Input 
            placeholder="Search by name or phone..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            title="No customers found"
            description={search ? "Try a different search term." : "Add your first customer to get started."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name & Phone</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((c) => (
                  <tr 
                    key={c.customerId} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/customers/${c.customerId}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-sm text-gray-500">{c.phone}</div>
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${Number(c.outstandingBalance) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(c.outstandingBalance)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {c.lastTransactionAt ? formatDate(c.lastTransactionAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCustomerModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
}
