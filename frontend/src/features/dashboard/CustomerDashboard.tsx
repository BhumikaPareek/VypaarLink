import { useQuery } from '@tanstack/react-query';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiGetCustomerDashboard } from '@/api/customer-dashboard';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { useAuthContext } from '@/store/AuthContext';
import { Link } from 'react-router-dom';

export function CustomerDashboard() {
  const { user } = useAuthContext();
  
  const { data, isLoading } = useQuery({
    queryKey: ['customer-dashboard'],
    queryFn: apiGetCustomerDashboard,
  });

  if (isLoading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (!data) return null;

  const hasTransactions = data.recentTransactions.length > 0;
  const hasShops = data.shops.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Welcome, {user?.name}</h1>
          <p className="text-text-muted text-sm mt-1">Here is your outstanding ledger summary.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard 
          label="Total Outstanding" 
          value={formatCurrency(data.totalOutstanding)} 
          accent="prominent"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
          label="Connected Shops" 
          value={data.connectedShopsCount} 
          accent="neutral"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard 
          label="Pending Confirmations" 
          value={data.pendingConfirmations} 
          accent="warning"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Recent Transactions */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-semibold text-text">Recent Transactions</h2>
            </div>
            
            {!hasTransactions ? (
              <EmptyState 
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
                title="No transactions yet"
                description="Your shops have not recorded any transactions yet."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-bg border-b border-border">
                      <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Shop</th>
                      <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-bg transition-colors duration-150">
                        <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-text">{tx.shop?.name || 'Unknown'}</td>
                        <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${tx.type === 'CREDIT' ? 'text-red-700' : 'text-primary'}`}>
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

        <div className="flex flex-col gap-6">
          {/* My Shops */}
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">My Shops</h2>
            </div>
            
            {!hasShops ? (
              <div className="p-6 text-center text-text-muted text-sm">
                You are not connected to any shops yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.shops.map(shop => (
                  <Link 
                    key={shop.shopId} 
                    to={`/customer/ledger/${shop.shopId}`}
                    className="group block px-6 py-4 hover:bg-bg transition-colors duration-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-text group-hover:text-primary transition-colors">{shop.shopName}</h3>
                        <p className={`text-sm mt-0.5 font-medium ${Number(shop.outstandingBalance) > 0 ? 'text-red-700' : 'text-text-muted'}`}>
                          {formatCurrency(shop.outstandingBalance)} due
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        View Ledger <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

