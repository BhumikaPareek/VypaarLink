import { useParams, useNavigate } from 'react-router';
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RecordCreditModal } from '@/features/transactions/RecordCreditModal';
import { RecordPaymentModal } from '@/features/transactions/RecordPaymentModal';
import { apiGetCustomer } from '@/api/customers';
import { apiConfirmTransaction } from '@/api/transactions';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useAuthContext } from '@/store/AuthContext';

export function CustomerProfilePage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => apiGetCustomer(customerId!),
    enabled: !!customerId,
  });

  const confirmMutation = useMutation({
    mutationFn: apiConfirmTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading) return <div className="p-6">Loading profile...</div>;
  if (!data) return <div className="p-6">Customer not found.</div>;

  const { customer, outstandingBalance, totalCredit, totalPayments, transactions } = data.customer;
  const isCustomerRole = user?.role === 'CUSTOMER';

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-gray-500">{customer.phone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Outstanding Balance</div>
          <div className={`text-3xl font-bold ${Number(outstandingBalance) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(outstandingBalance)}
          </div>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Credit Given</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalCredit)}</div>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Payments Received</div>
          <div className="text-2xl font-bold text-primary">{formatCurrency(totalPayments)}</div>
        </div>
      </div>

      {!isCustomerRole && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsCreditOpen(true)}>Record Credit</Button>
          <Button onClick={() => setIsPaymentOpen(true)}>Record Payment</Button>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
        </div>
        
        {transactions.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            title="No transactions"
            description="There is no transaction history for this customer."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Note</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  {isCustomerRole && <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDateTime(tx.transactionDate || tx.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{tx.note || '—'}</td>
                    <td className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-red-600' : 'text-primary'}`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tx.type === 'CREDIT' ? 'danger' : 'success'} label={tx.type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tx.status === 'PENDING' ? 'warning' : tx.status === 'CONFIRMED' ? 'success' : 'danger'} label={tx.status} />
                    </td>
                    {isCustomerRole && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tx.status === 'PENDING' && (
                          <Button 
                            size="sm" 
                            onClick={() => confirmMutation.mutate(tx.id)}
                            loading={confirmMutation.isPending && confirmMutation.variables === tx.id}
                          >
                            Confirm
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordCreditModal isOpen={isCreditOpen} onClose={() => setIsCreditOpen(false)} preselectedCustomerId={customerId} />
      <RecordPaymentModal isOpen={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} preselectedCustomerId={customerId} />
    </div>
  );
}


