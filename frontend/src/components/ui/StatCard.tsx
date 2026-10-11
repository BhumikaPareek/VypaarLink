import type { ReactNode } from 'react';

type StatCardProps = {
  label: string
  value: string | number
  sublabel?: string
  accent?: 'neutral' | 'prominent' | 'positive' | 'warning' | 'danger'
  icon?: ReactNode
}

export function StatCard({ label, value, sublabel, accent = 'neutral', icon }: StatCardProps) {
  const styles = {
    neutral: {
      value: 'text-text',
      bg: 'bg-surface',
      border: 'border-border',
      iconBg: 'bg-gray-100',
      iconColor: 'text-text-muted',
    },
    prominent: {
      value: 'text-primary-dark',
      bg: 'bg-surface',
      border: 'border-primary/20',
      iconBg: 'bg-primary-light/50',
      iconColor: 'text-primary',
    },
    positive: {
      value: 'text-green-700',
      bg: 'bg-surface',
      border: 'border-green-100',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    warning: {
      value: 'text-amber-700',
      bg: 'bg-surface',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    danger: {
      value: 'text-red-700',
      bg: 'bg-surface',
      border: 'border-red-100',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    }
  }

  const currentStyle = styles[accent];

  return (
    <div className={`p-5 rounded-2xl border ${currentStyle.bg} ${currentStyle.border} shadow-sm flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-md`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium text-text-muted">{label}</span>
        {icon && (
          <div className={`p-2 rounded-lg ${currentStyle.iconBg} ${currentStyle.iconColor}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${currentStyle.value} mt-1`}>
        {value}
      </div>
      {sublabel && <span className="text-xs text-text-muted mt-2 font-medium">{sublabel}</span>}
    </div>
  )
}
