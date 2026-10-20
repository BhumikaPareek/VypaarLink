import { useState, useId } from 'react'
import type { CashflowData, CashflowInterval } from '@/types/analytics'
import { formatCurrency } from '@/utils/format'

type CashflowChartProps = {
  data: CashflowData
  selectedGroupBy: 'day' | 'week' | 'month'
  onGroupByChange: (groupBy: 'day' | 'week' | 'month') => void
}

export function CashflowChart({ data, selectedGroupBy, onGroupByChange }: CashflowChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const chartId = useId()

  const timeline = data.timeline
  const hasData = timeline.length > 0

  // Find max value for scaling
  const maxVal = Math.max(
    ...timeline.map((d) => Math.max(d.creditIssued, d.paymentsCollected)),
    100
  )

  // Chart dimensions
  const svgWidth = 700
  const svgHeight = 240
  const paddingLeft = 55
  const paddingRight = 20
  const paddingTop = 25
  const paddingBottom = 45

  const chartWidth = svgWidth - paddingLeft - paddingRight
  const chartHeight = svgHeight - paddingTop - paddingBottom

  // Group width
  const groupCount = timeline.length
  const groupWidth = groupCount > 0 ? chartWidth / groupCount : chartWidth
  const barWidth = Math.max(3, Math.min(18, (groupWidth - 8) / 2))

  // Y-axis grid increments
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    pct,
    value: Math.round(maxVal * pct),
    y: paddingTop + chartHeight * (1 - pct),
  }))

  const hoveredItem = hoveredIndex !== null && timeline[hoveredIndex] ? timeline[hoveredIndex] : null

  return (
    <figure className="bg-surface rounded-2xl border border-border p-5 shadow-sm">
      <figcaption className="sr-only">
        Cashflow comparison of credit issued versus payments collected over time
      </figcaption>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-text">Cashflow & Collections</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Credit issued vs. customer repayments collected over time
          </p>
        </div>

        {/* GroupBy Buttons */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg" role="group" aria-label="Timeline aggregation">
          {(['day', 'week', 'month'] as const).map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => onGroupByChange(group)}
              aria-pressed={selectedGroupBy === group}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors duration-150 ${
                selectedGroupBy === group
                  ? 'bg-surface text-primary shadow-sm font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {group === 'day' ? 'Daily' : group === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 mb-5 rounded-xl bg-gray-50 border border-gray-100">
        <div>
          <div className="text-[11px] font-medium text-text-muted">Total Credit Given</div>
          <div className="text-base font-bold text-tangerine mt-0.5">
            {formatCurrency(data.summary.totalCredit)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-text-muted">Payments Collected</div>
          <div className="text-base font-bold text-primary mt-0.5">
            {formatCurrency(data.summary.totalPayments)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-text-muted">Net Cash Balance</div>
          <div
            className={`text-base font-bold mt-0.5 ${
              parseFloat(data.summary.netCashflow) >= 0 ? 'text-primary' : 'text-red-600'
            }`}
          >
            {parseFloat(data.summary.netCashflow) >= 0 ? '+' : ''}
            {formatCurrency(data.summary.netCashflow)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium text-text-muted">Daily Avg Collection</div>
          <div className="text-base font-bold text-text mt-0.5">
            {formatCurrency(data.summary.averageDailyPayment)}
          </div>
        </div>
      </div>

      {/* Legend & Tooltip Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-text">
            <span className="w-3 h-3 rounded bg-[#066B55]" aria-hidden="true" />
            <span className="font-medium">Payments Collected</span>
          </span>
          <span className="flex items-center gap-1.5 text-text">
            <span className="w-3 h-3 rounded bg-[#F97316]" aria-hidden="true" />
            <span className="font-medium">Credit Issued</span>
          </span>
        </div>

        {hoveredItem ? (
          <div className="text-xs bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-1 rounded-md font-medium">
            <span className="font-bold">{hoveredItem.label}:</span> Collected{' '}
            <span className="text-primary font-bold">{formatCurrency(hoveredItem.paymentsCollected)}</span> | Credit{' '}
            <span className="text-tangerine font-bold">{formatCurrency(hoveredItem.creditIssued)}</span>
          </div>
        ) : (
          <span className="text-text-muted text-[11px]">Hover or tap a bar to inspect details</span>
        )}
      </div>

      {/* SVG Chart */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-48 text-text-muted text-sm">
          No transactions recorded in the selected period.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[500px]"
            role="img"
            aria-labelledby={`${chartId}-title`}
          >
            <title id={`${chartId}-title`}>Credit and Cashflow Bar Chart</title>

            {/* Y-axis Grid Lines & Labels */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={tick.y}
                  x2={svgWidth - paddingRight}
                  y2={tick.y}
                  stroke="#e5e7eb"
                  strokeDasharray={tick.pct > 0 && tick.pct < 1 ? '3 3' : undefined}
                />
                <text
                  x={paddingLeft - 8}
                  y={tick.y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#94a3b8"
                  fontFamily="sans-serif"
                >
                  ₹{tick.value >= 1000 ? `${(tick.value / 1000).toFixed(0)}k` : tick.value}
                </text>
              </g>
            ))}

            {/* Bars */}
            {timeline.map((item: CashflowInterval, index: number) => {
              const groupCenterX = paddingLeft + index * groupWidth + groupWidth / 2
              const payBarHeight = (item.paymentsCollected / maxVal) * chartHeight
              const credBarHeight = (item.creditIssued / maxVal) * chartHeight

              const payY = paddingTop + chartHeight - payBarHeight
              const credY = paddingTop + chartHeight - credBarHeight

              const isHovered = hoveredIndex === index

              // Show label conditionally to avoid crowding
              const showLabel =
                groupCount <= 12 ||
                index === 0 ||
                index === groupCount - 1 ||
                index % Math.ceil(groupCount / 8) === 0

              return (
                <g
                  key={item.key}
                  tabIndex={0}
                  role="graphics-symbol"
                  aria-label={`${item.label}: Collected ${formatCurrency(item.paymentsCollected)}, Credit ${formatCurrency(item.creditIssued)}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onFocus={() => setHoveredIndex(index)}
                  onBlur={() => setHoveredIndex(null)}
                  className="cursor-pointer focus:outline-none"
                >
                  {/* Subtle hover background highlight */}
                  {isHovered && (
                    <rect
                      x={paddingLeft + index * groupWidth}
                      y={paddingTop}
                      width={groupWidth}
                      height={chartHeight}
                      fill="#f0fdf4"
                      opacity="0.6"
                      rx="4"
                    />
                  )}

                  {/* Payment Bar (Emerald) */}
                  <rect
                    x={groupCenterX - barWidth - 1}
                    y={payY}
                    width={barWidth}
                    height={Math.max(2, payBarHeight)}
                    fill={isHovered ? '#059669' : '#066B55'}
                    rx="2"
                    className="transition-all duration-150"
                  />

                  {/* Credit Bar (Tangerine) */}
                  <rect
                    x={groupCenterX + 1}
                    y={credY}
                    width={barWidth}
                    height={Math.max(2, credBarHeight)}
                    fill={isHovered ? '#fb923c' : '#F97316'}
                    rx="2"
                    className="transition-all duration-150"
                  />

                  {/* X-axis Date Label */}
                  {showLabel && (
                    <text
                      x={groupCenterX}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isHovered ? '#17252A' : '#64748B'}
                      fontWeight={isHovered ? 'bold' : 'normal'}
                      fontFamily="sans-serif"
                    >
                      {item.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Baseline */}
            <line
              x1={paddingLeft}
              y1={paddingTop + chartHeight}
              x2={svgWidth - paddingRight}
              y2={paddingTop + chartHeight}
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      {/* Accessible Table for Screen Readers */}
      <table className="sr-only">
        <caption>Cashflow timeline data</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Payments Collected</th>
            <th scope="col">Credit Issued</th>
            <th scope="col">Net Cashflow</th>
          </tr>
        </thead>
        <tbody>
          {timeline.map((item) => (
            <tr key={item.key}>
              <td>{item.label}</td>
              <td>{formatCurrency(item.paymentsCollected)}</td>
              <td>{formatCurrency(item.creditIssued)}</td>
              <td>{formatCurrency(item.netCashflow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
