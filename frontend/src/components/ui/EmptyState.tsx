import { type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode | { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const actionNode =
    action && typeof action === 'object' && 'label' in action && 'onClick' in action
      ? <Button onClick={(action as { label: string; onClick: () => void }).onClick} size="sm">{(action as { label: string; onClick: () => void }).label}</Button>
      : action as ReactNode

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-full mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-5">{description}</p>
      {actionNode && <div>{actionNode}</div>}
    </div>
  )
}
