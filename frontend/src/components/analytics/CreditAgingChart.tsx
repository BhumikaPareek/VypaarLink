import { Link } from 'react-router-dom'
import type { CreditAgingData } from '@/types/analytics'
import { formatCurrency } from '@/utils/format'

type CreditAgingChartProps = {
  data: CreditAgingData
}

export function CreditAgingChart({ data }: CreditAgingChartProps) {
  const total = parseFloat(data.totalOutstanding)
  const buckets = data.buckets

  const bucketColors: Record<string, { bg: string; bar: string; text: string; badge: string; risk: string }> = {
    '0-15': {
      bg: 'bg-emerald-50',
      bar: 'bg-emerald-600',
      text: 'text-emerald-800',
      badge: 'bg-emerald-100 text-emerald-800',
      risk: 'Healthy (0–15d)',
    },
    '16-30': {
      bg: 'bg-amber-50',
      bar: 'bg-amber-500',
      text: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-800',
      risk: 'Due (16–30d)',
    },
    '31-60': {
      bg: 'bg-orange-50',
      bar: 'bg-orange-500',
      text: 'text-orange-800',
      badge: 'bg-orange-100 text-orange-800',
      risk: 'Overdue (31–60d)',
    },
    '60+': {
      bg: 'bg-red-50',
      bar: 'bg-red-600',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-800',
      risk: 'Critical (>60d)',
    },
  }

  const criticalBucket = buckets.find((b) => b.bucket === '60+')
  const criticalAmount = criticalBucket ? parseFloat(criticalBucket.amount) : 0

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-lg font-bold text-text">Customer Credit Aging (FIFO)</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Breakdown of outstanding customer balances by age of debt using FIFO ledger allocation
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-muted">Total Active Debt</div>
          <div className="text-xl font-bold text-text">{formatCurrency(data.totalOutstanding)}</div>
        </div>
      </div>

      {total <= 0 ? (
        <div className="text-center py-8 text-sm text-text-muted bg-gray-50 rounded-xl border border-dashed border-gray-200">
          🎉 No outstanding customer debt! All past credit transactions have been fully cleared.
        </div>
      ) : (
        <>
          {/* Critical Risk Alert */}
          {criticalAmount > 0 && (
            <div
              role="alert"
              className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs"
            >
              <svg
                className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <span className="font-bold">Attention Needed:</span>{' '}
                <span className="font-semibold">{formatCurrency(criticalAmount)}</span> of credit is over 60 days
                overdue across {criticalBucket?.customerCount ?? 0} customers. Consider sending payment reminders.
              </div>
            </div>
          )}

          {/* Proportional Stacked Bar */}
          <div>
            <div className="flex justify-between items-center text-xs text-text-muted mb-1.5 font-medium">
              <span>Debt Distribution by Age</span>
              <span>{data.totalDebtors} Active Debtors</span>
            </div>
            <div
              className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex"
              role="progressbar"
              aria-valuenow={100}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Credit aging proportion"
            >
              {buckets.map((b) => {
                const pct = b.percentage
                if (pct <= 0) return null
                const color = bucketColors[b.bucket]?.bar ?? 'bg-gray-400'
                return (
                  <div
                    key={b.bucket}
                    style={{ width: `${pct}%` }}
                    className={`${color} h-full transition-all duration-300 relative group`}
                    title={`${b.label}: ${formatCurrency(b.amount)} (${pct}%)`}
                  />
                )
              })}
            </div>
          </div>

          {/* 4 Bucket Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {buckets.map((b) => {
              const theme = bucketColors[b.bucket]!
              return (
                <div
                  key={b.bucket}
                  className={`p-3.5 rounded-xl border border-border ${theme.bg} flex flex-col justify-between`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-xs font-semibold text-text">{b.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${theme.badge}`}>
                      {b.percentage}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className={`text-base font-bold ${theme.text}`}>{formatCurrency(b.amount)}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      {b.customerCount} {b.customerCount === 1 ? 'customer' : 'customers'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Top Debtors Section */}
          {data.topDebtors.length > 0 && (
            <div className="mt-2 pt-4 border-t border-border">
              <h3 className="text-sm font-bold text-text mb-3">Top Customers with Outstanding Balances</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted font-medium">
                      <th scope="col" className="pb-2">Customer</th>
                      <th scope="col" className="pb-2">Phone</th>
                      <th scope="col" className="pb-2 text-right">Outstanding Debt</th>
                      <th scope="col" className="pb-2 text-right">Oldest Unpaid Debt</th>
                      <th scope="col" className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topDebtors.map((debtor) => (
                      <tr key={debtor.customerId} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 font-semibold text-text">{debtor.name}</td>
                        <td className="py-2.5 text-text-muted font-mono">{debtor.phone}</td>
                        <td className="py-2.5 text-right font-bold text-tangerine">
                          {formatCurrency(debtor.balance)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              debtor.oldestDebtDays > 60
                                ? 'bg-red-100 text-red-700 font-semibold'
                                : debtor.oldestDebtDays > 30
                                ? 'bg-orange-100 text-orange-700'
                                : debtor.oldestDebtDays > 15
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {debtor.oldestDebtDays} days ago
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <Link
                            to={`/customers/${debtor.customerId}`}
                            className="text-primary hover:underline font-medium text-xs"
                          >
                            View Ledger →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
