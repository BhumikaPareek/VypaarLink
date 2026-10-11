import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiGetStockMovements } from '@/api/inventory'
import { formatDateTime } from '@/utils/format'
import type { Product, StockMovementType } from '@/types/inventory'

type Props = {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

const movementConfig: Record<StockMovementType, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }> = {
  OPENING_STOCK: { label: 'Opening Stock', variant: 'info' },
  STOCK_IN: { label: 'Stock In', variant: 'success' },
  STOCK_OUT: { label: 'Stock Out', variant: 'danger' },
  ADJUSTMENT: { label: 'Adjustment', variant: 'warning' },
  SALE: { label: 'Sale', variant: 'neutral' },
}

export function StockMovementsModal({ isOpen, onClose, product }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['product-movements', product?.id],
    queryFn: () => apiGetStockMovements(product!.id),
    enabled: isOpen && !!product,
  })

  const movements = data?.movements ?? []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Stock Movement History" maxWidth="max-w-lg">
      {product && (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="font-semibold text-gray-900 text-sm">{product.name}</div>
            <div className="text-gray-500 text-xs mt-0.5">
              Current stock: <span className="font-medium text-gray-800">{product.quantity} {product.unit}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-6 text-center text-gray-500 text-sm">Loading history...</div>
          ) : movements.length === 0 ? (
            <EmptyState
              icon={<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              title="No movements yet"
              description="Stock history will appear here after adjustments."
            />
          ) : (
            <div className="flex flex-col divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {movements.map((m) => {
                const config = movementConfig[m.type]
                return (
                  <div key={m.id} className="flex items-center justify-between py-3 px-1">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} label={config.label} />
                        {m.note && <span className="text-xs text-gray-500 truncate max-w-[200px]">{m.note}</span>}
                      </div>
                      <div className="text-xs text-gray-400">{formatDateTime(m.createdAt)}</div>
                    </div>
                    <div className={`text-sm font-semibold tabular-nums ${
                      m.type === 'STOCK_IN' || m.type === 'OPENING_STOCK'
                        ? 'text-green-600'
                        : m.type === 'STOCK_OUT' || m.type === 'SALE'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {m.type === 'ADJUSTMENT' ? '=' : m.type === 'STOCK_IN' || m.type === 'OPENING_STOCK' ? '+' : '-'}{m.quantity} {product.unit}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
