import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  apiGetAnalyticsOverview,
  apiGetCreditAging,
  apiGetCashflow,
  apiGetInventoryInsights,
  apiGetSupplierInsights,
} from '@/api/analytics'
import type { AnalyticsRange, AnalyticsFilter } from '@/types/analytics'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CashflowChart } from '@/components/analytics/CashflowChart'
import { CreditAgingChart } from '@/components/analytics/CreditAgingChart'
import { formatCurrency, formatDate } from '@/utils/format'

type TabType = 'overview' | 'cashflow' | 'aging' | 'inventory' | 'suppliers'

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [appliedCustom, setAppliedCustom] = useState<{ start: string; end: string } | null>(null)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  // Filter object for query
  const filter: AnalyticsFilter = {
    range,
    ...(range === 'custom' && appliedCustom
      ? { startDate: appliedCustom.start, endDate: appliedCustom.end }
      : {}),
    groupBy,
  }

  // 1. Overview Query
  const {
    data: overview,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['analytics-overview', range, appliedCustom],
    queryFn: () => apiGetAnalyticsOverview(filter),
  })

  // 2. Credit Aging Query
  const {
    data: creditAging,
    isLoading: isAgingLoading,
    isError: isAgingError,
    refetch: refetchAging,
  } = useQuery({
    queryKey: ['analytics-credit-aging'],
    queryFn: apiGetCreditAging,
  })

  // 3. Cashflow Query
  const {
    data: cashflow,
    isLoading: isCashflowLoading,
    isError: isCashflowError,
    refetch: refetchCashflow,
  } = useQuery({
    queryKey: ['analytics-cashflow', range, appliedCustom, groupBy],
    queryFn: () => apiGetCashflow(filter),
  })

  // 4. Inventory Insights Query
  const {
    data: inventory,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ['analytics-inventory', range, appliedCustom],
    queryFn: () => apiGetInventoryInsights(filter),
  })

  // 5. Supplier Insights Query
  const {
    data: suppliers,
    isLoading: isSuppliersLoading,
    isError: isSuppliersError,
    refetch: refetchSuppliers,
  } = useQuery({
    queryKey: ['analytics-suppliers', range, appliedCustom],
    queryFn: () => apiGetSupplierInsights(filter),
  })

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customStart || !customEnd) return
    if (new Date(customStart) > new Date(customEnd)) return
    setAppliedCustom({ start: customStart, end: customEnd })
  }

  const handleRangeChange = (newRange: AnalyticsRange) => {
    setRange(newRange)
    if (newRange !== 'custom') {
      setAppliedCustom(null)
    }
  }

  const isLoading =
    isOverviewLoading || isAgingLoading || isCashflowLoading || isInventoryLoading || isSuppliersLoading

  const isError =
    isOverviewError || isAgingError || isCashflowError || isInventoryError || isSuppliersError

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* ── Top Header & Date Filters ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text tracking-tight">Business Analytics</h1>
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
              Live Intelligence
            </span>
          </div>
          <p className="text-text-muted text-sm mt-1">
            Real-time analysis of store cashflow, customer credit risks, stock run-rate, and supplier payables.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
          <div
            className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium w-full sm:w-auto overflow-x-auto"
            role="group"
            aria-label="Analytics date range filter"
          >
            {(
              [
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleRangeChange(opt.id)}
                aria-pressed={range === opt.id}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  range === opt.id
                    ? 'bg-surface text-primary shadow-sm font-semibold'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Form (visible only when custom is selected) */}
      {range === 'custom' && (
        <form
          onSubmit={handleApplyCustom}
          className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-wrap items-center gap-3 text-xs"
        >
          <span className="font-semibold text-text">Custom Date Range:</span>
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-start" className="text-text-muted">
              From:
            </label>
            <input
              id="analytics-start"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              required
              className="border border-border rounded-lg px-2.5 py-1 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="analytics-end" className="text-text-muted">
              To:
            </label>
            <input
              id="analytics-end"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              required
              className="border border-border rounded-lg px-2.5 py-1 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm">
            Apply Range
          </Button>
          {appliedCustom && (
            <span className="text-primary font-medium ml-2">
              Showing {formatDate(appliedCustom.start)} to {formatDate(appliedCustom.end)}
            </span>
          )}
        </form>
      )}

      {/* ── Navigation Tabs ── */}
      <nav
        className="flex border-b border-border space-x-1 sm:space-x-4 overflow-x-auto text-sm font-medium"
        aria-label="Dashboard sections"
      >
        {[
          { id: 'overview', label: 'Executive Overview' },
          { id: 'cashflow', label: 'Cashflow & Collections' },
          { id: 'aging', label: 'Credit Aging & Debt' },
          { id: 'inventory', label: 'Inventory Velocity' },
          { id: 'suppliers', label: 'Supplier Intelligence' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-text-muted hover:text-text hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Loading Skeleton / Error State ── */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-gray-200/70 rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
          <span>Failed to load analytics data. Please check your connection.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              refetchOverview()
              refetchAging()
              refetchCashflow()
              refetchInventory()
              refetchSuppliers()
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
      {overview && activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              label="Credit Issued"
              value={formatCurrency(overview.creditIssued)}
              sublabel={`${overview.creditTransactionsCount} credit transactions`}
              accent="warning"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />

            <StatCard
              label="Payments Collected"
              value={formatCurrency(overview.paymentsCollected)}
              sublabel={`${overview.paymentTransactionsCount} payments`}
              accent="positive"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            <StatCard
              label="Net Cash Difference"
              value={formatCurrency(overview.netCreditChange)}
              sublabel="Credit issued minus repayments"
              accent={parseFloat(overview.netCreditChange) <= 0 ? 'positive' : 'warning'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 18h12l3-18H3z" />
                </svg>
              }
            />

            <StatCard
              label="Customer Debt"
              value={formatCurrency(overview.currentOutstandingCustomerDebt)}
              sublabel={`Across ${overview.activeCustomersCount} connected customers`}
              accent="prominent"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />

            <StatCard
              label="Inventory Retail Value"
              value={formatCurrency(overview.inventoryRetailValue)}
              sublabel={`Cost basis: ${formatCurrency(overview.inventoryCostBasis)}`}
              accent="neutral"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />

            <StatCard
              label="Supplier Payables"
              value={formatCurrency(overview.supplierOutstandingPayable)}
              sublabel={`Across ${overview.activeSuppliersCount} suppliers`}
              accent={parseFloat(overview.supplierOutstandingPayable) > 0 ? 'danger' : 'neutral'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
          </div>

          {/* Quick Stock Status Badges */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-surface rounded-xl border border-border text-xs">
            <span className="font-semibold text-text">Inventory Watch:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-text">
              <span className="font-bold">{overview.totalProductsCount}</span> Active Products
            </span>
            {overview.lowStockCount > 0 ? (
              <Link
                to="/inventory?stockStatus=low"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-bold">{overview.lowStockCount}</span> Low Stock Items
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                ✓ No Low Stock Items
              </span>
            )}
            {overview.outOfStockCount > 0 ? (
              <Link
                to="/inventory?stockStatus=out"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold">{overview.outOfStockCount}</span> Out of Stock
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                ✓ Full Availability
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CASHFLOW & COLLECTIONS ── */}
      {cashflow && (activeTab === 'overview' || activeTab === 'cashflow') && (
        <CashflowChart
          data={cashflow}
          selectedGroupBy={groupBy}
          onGroupByChange={(g) => setGroupBy(g)}
        />
      )}

      {/* ── TAB 3: CREDIT AGING & DEBTORS ── */}
      {creditAging && (activeTab === 'overview' || activeTab === 'aging') && (
        <CreditAgingChart data={creditAging} />
      )}

      {/* ── TAB 4: INVENTORY HEALTH & VELOCITY ── */}
      {inventory && (activeTab === 'overview' || activeTab === 'inventory') && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Fast-Moving Items */}
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-text">Fast-Moving Products (Top 5)</h2>
                  <p className="text-xs text-text-muted mt-0.5">Ranked by units sold in the selected period</p>
                </div>
                <Badge variant="success" label="High Velocity" />
              </div>

              {inventory.fastMovingProducts.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted bg-gray-50 rounded-xl">
                  No sales movements recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted font-medium">
                        <th scope="col" className="pb-2">Product</th>
                        <th scope="col" className="pb-2 text-right">Units Sold</th>
                        <th scope="col" className="pb-2 text-right">Revenue</th>
                        <th scope="col" className="pb-2 text-right">In Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {inventory.fastMovingProducts.map((p) => (
                        <tr key={p.productId} className="hover:bg-gray-50/70">
                          <td className="py-2.5">
                            <div className="font-semibold text-text">{p.name}</div>
                            {p.category && <div className="text-[10px] text-text-muted">{p.category}</div>}
                          </td>
                          <td className="py-2.5 text-right font-bold text-primary">
                            {p.quantitySold} {p.unit}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-text">
                            {formatCurrency(p.totalRevenue)}
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                p.currentStock === 0
                                  ? 'bg-red-100 text-red-700'
                                  : p.currentStock <= 5
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-text'
                              }`}
                            >
                              {p.currentStock} {p.unit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dead Stock Warning */}
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-base font-bold text-text">Dead Stock Alert (30+ Days)</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Active products with inventory but zero movement in over 30 days
                  </p>
                </div>
                <Badge variant="warning" label={`${inventory.deadStockProducts.length} Items`} />
              </div>

              {inventory.deadStockProducts.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted bg-gray-50 rounded-xl">
                  ✓ Healthy inventory rotation! No active products are stagnant.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted font-medium">
                        <th scope="col" className="pb-2">Product</th>
                        <th scope="col" className="pb-2 text-right">Quantity</th>
                        <th scope="col" className="pb-2 text-right">Tied-Up Capital</th>
                        <th scope="col" className="pb-2 text-right">Inactive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {inventory.deadStockProducts.map((p) => (
                        <tr key={p.productId} className="hover:bg-gray-50/70">
                          <td className="py-2.5">
                            <div className="font-semibold text-text">{p.name}</div>
                            {p.category && <div className="text-[10px] text-text-muted">{p.category}</div>}
                          </td>
                          <td className="py-2.5 text-right text-text-muted font-medium">
                            {p.quantity} {p.unit}
                          </td>
                          <td className="py-2.5 text-right font-bold text-amber-700">
                            {formatCurrency(p.tiedUpCapital)}
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-semibold">
                              {p.daysInactive}d inactive
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Stockout Run-Rate Projections */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-text">Stockout Run-Rate Projections</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Estimated days until stockout based on historical sales velocity
                </p>
              </div>
              <Link to="/purchase-orders" className="text-primary text-xs font-semibold hover:underline">
                Create Restock PO →
              </Link>
            </div>

            {inventory.stockoutProjections.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-muted bg-gray-50 rounded-xl">
                No active inventory products with stock to project.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted font-medium">
                      <th scope="col" className="pb-2">Product</th>
                      <th scope="col" className="pb-2 text-right">Current Stock</th>
                      <th scope="col" className="pb-2 text-right">Sales Velocity</th>
                      <th scope="col" className="pb-2 text-right">Runway (Est. Days)</th>
                      <th scope="col" className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.stockoutProjections.map((p) => {
                      const isCritical = p.daysUntilStockout !== null && p.daysUntilStockout <= 7
                      const isWarning =
                        p.daysUntilStockout !== null && p.daysUntilStockout > 7 && p.daysUntilStockout <= 14

                      return (
                        <tr key={p.productId} className="hover:bg-gray-50/70">
                          <td className="py-2.5 font-semibold text-text">{p.name}</td>
                          <td className="py-2.5 text-right font-medium text-text">
                            {p.currentStock} {p.unit}
                          </td>
                          <td className="py-2.5 text-right font-mono text-text-muted">
                            {p.dailyVelocity > 0 ? `${p.dailyVelocity} ${p.unit}/day` : '0 units/day'}
                          </td>
                          <td className="py-2.5 text-right font-bold text-text">
                            {p.daysUntilStockout !== null ? `~${p.daysUntilStockout} days` : '—'}
                          </td>
                          <td className="py-2.5 text-right">
                            {isCritical ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 text-red-800 font-bold animate-pulse">
                                Reorder Urgent (&lt;7d)
                              </span>
                            ) : isWarning ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-semibold">
                                Reorder Soon (&lt;14d)
                              </span>
                            ) : p.hasSufficientData ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                                Healthy Supply
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-text-muted font-medium">
                                Insufficient Sales Data
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: SUPPLIER INTELLIGENCE ── */}
      {suppliers && (activeTab === 'overview' || activeTab === 'suppliers') && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Spend & Payables Summary */}
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-text">Supplier Financial Summary</h2>
                <p className="text-xs text-text-muted mt-0.5">Purchases and outstanding liabilities</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-text-muted">Purchases in Period:</span>
                  <span className="text-sm font-bold text-text">
                    {formatCurrency(suppliers.totalPurchases)}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
                  <span className="text-xs text-emerald-800">Paid to Suppliers:</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {formatCurrency(suppliers.totalPaid)}
                  </span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex justify-between items-center">
                  <span className="text-xs text-red-800 font-semibold">Unpaid Payables:</span>
                  <span className="text-sm font-bold text-red-700">
                    {formatCurrency(suppliers.outstandingPayables)}
                  </span>
                </div>
              </div>

              {/* PO Status Breakdown */}
              <div className="border-t border-border pt-4">
                <div className="text-xs font-semibold text-text mb-2">Purchase Orders by Status</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {suppliers.poStatusDistribution.map((s) => (
                    <div key={s.status} className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="text-text-muted uppercase text-[9px] font-bold">{s.status}</div>
                      <div className="font-semibold text-text mt-0.5">
                        {s.count} POs ({formatCurrency(s.totalAmount)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payable Aging Buckets */}
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="text-base font-bold text-text">Supplier Payable Aging</h2>
                <p className="text-xs text-text-muted mt-0.5">Outstanding PO debts by invoice age</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {suppliers.payableAging.map((b) => (
                  <div
                    key={b.bucket}
                    className="p-3.5 rounded-xl border border-border bg-gray-50 flex flex-col justify-between"
                  >
                    <span className="text-xs font-semibold text-text">{b.label}</span>
                    <div className="mt-2">
                      <div className="text-sm font-bold text-text">{formatCurrency(b.amount)}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{b.poCount} POs</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                💡 <span className="font-semibold">Cashflow Tip:</span> Paying suppliers within payment terms ensures uninterrupted goods delivery and prevents supply disruptions.
              </div>
            </div>

            {/* Top Suppliers by Spend */}
            <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="text-base font-bold text-text">Top Suppliers by Spend</h2>
                <p className="text-xs text-text-muted mt-0.5">Suppliers with largest order volumes in period</p>
              </div>

              {suppliers.topSuppliersBySpend.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-muted bg-gray-50 rounded-xl">
                  No supplier orders recorded in this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted font-medium">
                        <th scope="col" className="pb-2">Supplier</th>
                        <th scope="col" className="pb-2 text-right">Total Spend</th>
                        <th scope="col" className="pb-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {suppliers.topSuppliersBySpend.slice(0, 5).map((s) => (
                        <tr key={s.supplierId} className="hover:bg-gray-50/70">
                          <td className="py-2.5">
                            <div className="font-semibold text-text">{s.supplierName}</div>
                            <div className="text-[10px] text-text-muted">{s.poCount} Orders</div>
                          </td>
                          <td className="py-2.5 text-right font-medium text-text">
                            {formatCurrency(s.totalSpend)}
                          </td>
                          <td className="py-2.5 text-right font-bold text-red-600">
                            {formatCurrency(s.outstandingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
