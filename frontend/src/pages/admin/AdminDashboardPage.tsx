/**
 * pages/admin/AdminDashboardPage.tsx — Complete Platform Administrator Dashboard
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGetAdminMetrics, apiGetAdminShops, apiGetAdminComplaints } from '@/api/admin'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'

type ActiveTab = 'overview' | 'shops' | 'complaints'

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [shopSearch, setShopSearch] = useState('')
  const [shopPage, setShopPage] = useState(1)
  const [complaintPage, setComplaintPage] = useState(1)

  // 1. Platform Metrics Query
  const {
    data: metrics,
    isLoading: isMetricsLoading,
    isError: isMetricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: apiGetAdminMetrics,
  })

  // 2. Shops Directory Query
  const {
    data: shopsData,
    isLoading: isShopsLoading,
    isError: isShopsError,
    refetch: refetchShops,
  } = useQuery({
    queryKey: ['admin', 'shops', shopPage, shopSearch],
    queryFn: () => apiGetAdminShops(shopPage, 20, shopSearch),
  })

  // 3. Flagged Disputes / Complaints Query
  const {
    data: complaintsData,
    isLoading: isComplaintsLoading,
    isError: isComplaintsError,
    refetch: refetchComplaints,
  } = useQuery({
    queryKey: ['admin', 'complaints', complaintPage],
    queryFn: () => apiGetAdminComplaints(complaintPage, 20),
  })

  const isLoading = isMetricsLoading || isShopsLoading || isComplaintsLoading
  const isError = isMetricsError || isShopsError || isComplaintsError

  function handleRefetchAll() {
    refetchMetrics()
    refetchShops()
    refetchComplaints()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Platform Administration</h1>
          <p className="text-sm text-text-muted mt-0.5">
            System overview, shop directory with customer metrics, and transaction disputes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleRefetchAll}
            disabled={isLoading}
            className="text-xs py-1.5"
          >
            <svg
              className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Global Error Alert */}
      {isError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Failed to load some platform data from the server.</span>
          </div>
          <Button variant="secondary" onClick={handleRefetchAll} className="text-xs py-1">
            Retry
          </Button>
        </div>
      )}

      {/* Metric Cards Banner (Always visible on overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Shops"
          value={metrics ? metrics.shops.total : '—'}
          sublabel={metrics ? `${metrics.shops.active} active shops` : undefined}
          accent="prominent"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <StatCard
          label="Registered Customers"
          value={metrics ? metrics.users.totalCustomers : '—'}
          sublabel={metrics ? `Across all verified shops` : undefined}
          accent="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />

        <StatCard
          label="Total Transactions"
          value={metrics ? metrics.transactions.total : '—'}
          sublabel={metrics ? `${metrics.transactions.confirmed} confirmed` : undefined}
          accent="positive"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <StatCard
          label="Flagged Disputes"
          value={metrics ? metrics.transactions.flagged : '—'}
          sublabel={metrics && metrics.transactions.flagged > 0 ? 'Requires attention' : 'No active disputes'}
          accent={metrics && metrics.transactions.flagged > 0 ? 'danger' : 'neutral'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
          }`}
        >
          Platform Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shops')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'shops'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
          }`}
        >
          <span>Shop Directory</span>
          {shopsData && (
            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {shopsData.pagination.total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('complaints')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'complaints'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
          }`}
        >
          <span>Flagged Disputes</span>
          {complaintsData && complaintsData.pagination.total > 0 && (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {complaintsData.pagination.total}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OVERVIEW SUMMARY */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shop Health Card */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold text-text">Shop Network Health</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-text-muted">Active Registered Shops</span>
                <span className="text-sm font-bold text-emerald-700">
                  {metrics?.shops.active ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-text-muted">Inactive / Deactivated Shops</span>
                <span className="text-sm font-bold text-gray-500">
                  {metrics?.shops.inactive ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-text-muted">Total Shopkeepers</span>
                <span className="text-sm font-bold text-text">
                  {metrics?.users.totalShopkeepers ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-text-muted">Total Customer Accounts</span>
                <span className="text-sm font-bold text-text">
                  {metrics?.users.totalCustomers ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Transaction Health Card */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-4">
            <h2 className="text-lg font-bold text-text">Transaction Status Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-text-muted">Mutual Confirmation Rate</span>
                <span className="text-sm font-bold text-text">
                  {metrics && metrics.transactions.total > 0
                    ? `${Math.round((metrics.transactions.confirmed / metrics.transactions.total) * 100)}%`
                    : '100%'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-text-muted">Confirmed Transactions</span>
                <span className="text-sm font-bold text-emerald-700">
                  {metrics?.transactions.confirmed ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-text-muted">Pending Mutual Confirmations</span>
                <span className="text-sm font-bold text-amber-600">
                  {metrics?.transactions.pending ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-text-muted">Flagged by Customers</span>
                <span className={`text-sm font-bold ${metrics && metrics.transactions.flagged > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {metrics?.transactions.flagged ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHOPS DIRECTORY */}
      {activeTab === 'shops' && (
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-text">Registered Shop Directory</h2>
              <p className="text-xs text-text-muted">Complete directory of shops and customer relationship counts.</p>
            </div>

            <div className="w-full sm:w-72">
              <Input
                placeholder="Search by shop or owner name…"
                value={shopSearch}
                onChange={(e) => {
                  setShopSearch(e.target.value)
                  setShopPage(1)
                }}
              />
            </div>
          </div>

          {/* Shops Table */}
          {isShopsLoading ? (
            <div className="py-12 text-center text-text-muted text-sm animate-pulse">
              Loading shops directory…
            </div>
          ) : !shopsData || shopsData.shops.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
              title="No shops found"
              description={shopSearch ? 'No shops match your search criteria.' : 'No shops are currently registered on the platform.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-text-muted bg-gray-50/50">
                    <th className="py-3 px-4 font-semibold">Shop Name</th>
                    <th className="py-3 px-4 font-semibold">Owner Contact</th>
                    <th className="py-3 px-4 font-semibold text-center">Customers</th>
                    <th className="py-3 px-4 font-semibold text-center">Transactions</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shopsData.shops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        <div>{shop.name}</div>
                        {shop.address && <div className="text-xs text-text-muted truncate max-w-xs">{shop.address}</div>}
                      </td>
                      <td className="py-3 px-4 text-text">
                        <div>{shop.owner.name}</div>
                        <div className="text-xs text-text-muted">{shop.owner.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                          {shop.customerCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-text-muted">
                        {shop.transactionCount}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={shop.isActive ? 'success' : 'neutral'}
                          label={shop.isActive ? 'Active' : 'Inactive'}
                        />
                      </td>
                      <td className="py-3 px-4 text-xs text-text-muted whitespace-nowrap">
                        {formatDate(shop.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination controls */}
              {shopsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                  <div className="text-xs text-text-muted">
                    Page {shopsData.pagination.page} of {shopsData.pagination.totalPages} ({shopsData.pagination.total} total shops)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={shopPage <= 1}
                      onClick={() => setShopPage((p) => Math.max(1, p - 1))}
                      className="text-xs py-1 px-3"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={shopPage >= shopsData.pagination.totalPages}
                      onClick={() => setShopPage((p) => p + 1)}
                      className="text-xs py-1 px-3"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FLAGGED DISPUTES / COMPLAINTS */}
      {activeTab === 'complaints' && (
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-text">Transaction Disputes & Customer Flags</h2>
            <p className="text-xs text-text-muted">
              Transactions where customers flagged a discrepancy or requested clarification. Note: Dedicated shopkeeper-to-admin support tickets represent a separate future feature.
            </p>
          </div>

          {isComplaintsLoading ? (
            <div className="py-12 text-center text-text-muted text-sm animate-pulse">
              Loading transaction disputes…
            </div>
          ) : !complaintsData || complaintsData.complaints.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              title="No flagged disputes"
              description="There are currently no customer-flagged transaction disputes on the platform."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-text-muted bg-gray-50/50">
                    <th className="py-3 px-4 font-semibold">Shop Name</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                    <th className="py-3 px-4 font-semibold">Flag Reason</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold">Flagged Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {complaintsData.complaints.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        <div>{item.shop.name}</div>
                        {item.shop.phone && <div className="text-xs text-text-muted">{item.shop.phone}</div>}
                      </td>
                      <td className="py-3 px-4 text-text">
                        <div>{item.customer.name}</div>
                        <div className="text-xs text-text-muted">{item.customer.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-text whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-red-700 max-w-sm">
                        <span className="line-clamp-2">{item.flagReason}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="danger" label={item.status} />
                      </td>
                      <td className="py-3 px-4 text-xs text-text-muted whitespace-nowrap">
                        {formatDateTime(item.flaggedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination controls */}
              {complaintsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                  <div className="text-xs text-text-muted">
                    Page {complaintsData.pagination.page} of {complaintsData.pagination.totalPages} ({complaintsData.pagination.total} disputes)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={complaintPage <= 1}
                      onClick={() => setComplaintPage((p) => Math.max(1, p - 1))}
                      className="text-xs py-1 px-3"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={complaintPage >= complaintsData.pagination.totalPages}
                      onClick={() => setComplaintPage((p) => p + 1)}
                      className="text-xs py-1 px-3"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
