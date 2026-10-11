import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetMyTransactions, apiConfirmTransaction, apiFlagTransaction } from '@/api/transactions';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function CustomerLedgerPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customer-transactions', shopId],
    queryFn: () => apiGetMyTransactions(shopId!),
    enabled: !!shopId,
  });

  const confirmMutation = useMutation({
    mutationFn: apiConfirmTransaction,
    onSuccess: () => {
      toast('Transaction confirmed!', 'success');
      queryClient.invalidateQueries({ queryKey: ['customer-transactions', shopId] });
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to confirm transaction', 'error');
    }
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string, reason: string }) => apiFlagTransaction(id, reason),
    onSuccess: () => {
      toast('Transaction flagged for review', 'success');
      setSelectedTxId(null);
      setFlagReason('');
      queryClient.invalidateQueries({ queryKey: ['customer-transactions', shopId] });
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to flag transaction', 'error');
    }
  });

  if (isLoading) {
    return <div className="p-6">Loading ledger...</div>;
  }

  const transactions = data?.transactions || [];

  const totalCredit = transactions.reduce((sum: number, tx: any) => tx.type === 'CREDIT' ? sum + Number(tx.amount) : sum, 0);
  const totalPayment = transactions.reduce((sum: number, tx: any) => tx.type === 'PAYMENT' ? sum + Number(tx.amount) : sum, 0);
  const outstandingBalance = totalCredit - totalPayment;
  const shopName = transactions.length > 0 && (transactions[0] as any)?.shop?.name ? (transactions[0] as any).shop.name : 'Shop';

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-4 mb-2">
        <Link 
          to="/dashboard" 
          className="p-2 -ml-2 rounded-lg text-text-muted hover:text-text hover:bg-gray-100 transition-colors"
          aria-label="Back to dashboard"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">{shopName} — My Ledger</h1>
          <p className="text-sm text-text-muted mt-0.5">Review and confirm your recent transactions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Credit</p>
          <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-4 shadow-sm">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total Payments</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalPayment)}</p>
        </div>
        <div className="bg-surface rounded-xl border border-primary/20 p-4 shadow-sm bg-primary-light/5">
          <p className="text-xs font-medium text-primary uppercase tracking-wider">Outstanding Balance</p>
          <p className="text-xl font-bold text-primary-dark mt-1">{formatCurrency(Math.max(0, outstandingBalance))}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState 
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
            title="No transactions"
            description="You have no transactions recorded with this shop yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg border-b border-border">
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-bg transition-colors duration-150">
                    <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                      {formatDateTime(tx.transactionDate || tx.createdAt)}
                      {tx.note && <div className="text-xs text-text-muted/70 mt-1 truncate max-w-[200px]">{tx.note}</div>}
                    </td>
                    <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-red-700' : 'text-primary'}`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tx.type === 'CREDIT' ? 'danger' : 'success'} label={tx.type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={tx.status === 'PENDING' ? 'warning' : tx.status === 'CONFIRMED' ? 'success' : 'danger'} label={tx.status} />
                      {tx.status === 'FLAGGED' && tx.flagReason && (
                        <div className="text-xs text-red-600 font-medium mt-1 max-w-[150px] truncate" title={tx.flagReason}>
                          "{tx.flagReason}"
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {tx.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="secondary" 
                            className="text-xs py-1 px-2 h-auto"
                            onClick={() => setSelectedTxId(selectedTxId === tx.id ? null : tx.id)}
                          >
                            Dispute
                          </Button>
                          <Button 
                            className="text-xs py-1 px-2 h-auto"
                            onClick={() => confirmMutation.mutate(tx.id)}
                            disabled={confirmMutation.isPending}
                          >
                            Confirm
                          </Button>
                        </div>
                      )}
                      
                      {/* Modal renders outside */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedTxId} onClose={() => { setSelectedTxId(null); setFlagReason(''); }} title="Dispute Transaction">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Please provide a reason for disputing this transaction. The shopkeeper will review it.</p>
          <Input 
            label="Reason" 
            placeholder="e.g. Amount is incorrect" 
            value={flagReason} 
            onChange={(e) => setFlagReason(e.target.value)} 
          />
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => { setSelectedTxId(null); setFlagReason(''); }}>Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 border-transparent text-white" 
              onClick={() => {
                if (selectedTxId) {
                  flagMutation.mutate({ id: selectedTxId, reason: flagReason });
                }
              }}
              disabled={flagMutation.isPending || !flagReason.trim()}
            >
              Submit Dispute
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

