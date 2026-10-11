import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiAdjustStock } from '@/api/inventory'
import { useToast } from '@/components/ui/Toast'
import type { Product } from '@/types/inventory'

type AdjustType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'

type Props = {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

const ADJUST_OPTIONS: { type: AdjustType; label: string; color: string; description: string }[] = [
  {
    type: 'STOCK_IN',
    label: 'Add Stock',
    color: 'bg-green-50 border-green-200 text-green-700',
    description: 'Received new stock, restocking inventory',
  },
  {
    type: 'STOCK_OUT',
    label: 'Remove Stock',
    color: 'bg-red-50 border-red-200 text-red-700',
    description: 'Damaged, expired, or manually removed items',
  },
  {
    type: 'ADJUSTMENT',
    label: 'Set Absolute Quantity',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    description: 'Override: set stock to a specific value (e.g., after physical count)',
  },
]

export function AdjustStockModal({ isOpen, onClose, product }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [adjustType, setAdjustType] = useState<AdjustType>('STOCK_IN')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { type: AdjustType; quantity: number; note?: string } }) =>
      apiAdjustStock(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['product', product?.id] })
      toast(`Stock updated. New quantity: ${res.product.quantity} ${res.product.unit}`, 'success')
      handleClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to adjust stock')
    },
  })

  const handleClose = () => {
    setQuantity('')
    setNote('')
    setError('')
    setAdjustType('STOCK_IN')
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty <= 0) { setError('Enter a valid positive quantity'); return }

    if (adjustType === 'STOCK_OUT' && product.quantity < qty) {
      setError(`Cannot remove ${qty} — only ${product.quantity} ${product.unit} available`)
      return
    }

    setError('')
    mutation.mutate({ id: product.id, data: { type: adjustType, quantity: qty, note: note.trim() || undefined } })
  }

  const selectedOption = ADJUST_OPTIONS.find((o) => o.type === adjustType)!

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adjust Stock" maxWidth="max-w-md">
      {product && (
        <div className="flex flex-col gap-4">
          {/* Product info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="font-semibold text-gray-900 text-sm">{product.name}</div>
            <div className="text-gray-500 text-xs mt-0.5">
              Current stock: <span className="font-medium text-gray-800">{product.quantity} {product.unit}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

            {/* Adjustment type selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Adjustment Type</label>
              <div className="flex flex-col gap-2">
                {ADJUST_OPTIONS.map((opt) => (
                  <label
                    key={opt.type}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      adjustType === opt.type ? opt.color + ' border-opacity-100' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adjustType"
                      value={opt.type}
                      checked={adjustType === opt.type}
                      onChange={() => setAdjustType(opt.type)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Input
              label={adjustType === 'ADJUSTMENT' ? `Set New Quantity (${product.unit})` : `Quantity (${product.unit})`}
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
              autoFocus
              hint={
                adjustType === 'STOCK_IN'
                  ? `New total will be: ${product.quantity + (parseInt(quantity) || 0)} ${product.unit}`
                  : adjustType === 'STOCK_OUT'
                  ? `New total will be: ${Math.max(0, product.quantity - (parseInt(quantity) || 0))} ${product.unit}`
                  : `Will override current stock of ${product.quantity} ${product.unit}`
              }
            />

            <Input
              label="Note (Optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. New delivery, Damaged goods count"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                className={adjustType === 'STOCK_OUT' ? 'bg-red-600 hover:bg-red-700 text-white border-transparent' : ''}
              >
                {selectedOption.label}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  )
}
