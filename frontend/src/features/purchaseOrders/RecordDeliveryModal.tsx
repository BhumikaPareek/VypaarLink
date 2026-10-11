import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiRecordGoodsReceipt } from '@/api/suppliers'
import { useToast } from '@/components/ui/Toast'
import type { PurchaseOrder } from '@/types/supplier'

type Props = {
  isOpen: boolean
  onClose: () => void
  order: PurchaseOrder | null
}

export function RecordDeliveryModal({ isOpen, onClose, order }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [receivingQuantities, setReceivingQuantities] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (order) {
      // Default each line's receiving quantity to the remaining ordered quantity
      const initial: Record<string, number> = {}
      order.items.forEach((item) => {
        const remaining = item.quantityOrdered - item.quantityReceived
        initial[item.id] = remaining > 0 ? remaining : 0
      })
      setReceivingQuantities(initial)
      setNotes('')
      setError('')
      setReceivedDate(new Date().toISOString().split('T')[0])
    }
  }, [order])

  const mutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      apiRecordGoodsReceipt(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', order?.id] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      toast('Delivery recorded & inventory updated successfully!', 'success')
      onClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to record delivery')
    },
  })

  const handleQuantityChange = (itemId: string, maxRemaining: number, val: number) => {
    const safeVal = Math.max(0, Math.min(val, maxRemaining))
    setReceivingQuantities((prev) => ({ ...prev, [itemId]: safeVal }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    const itemsToReceive = Object.entries(receivingQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([purchaseOrderItemId, quantityReceived]) => ({
        purchaseOrderItemId,
        quantityReceived,
      }))

    if (itemsToReceive.length === 0) {
      setError('Please enter receiving quantity of at least 1 for at least one item.')
      return
    }

    setError('')
    mutation.mutate({
      orderId: order.id,
      data: {
        receivedDate: receivedDate ? new Date(receivedDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        items: itemsToReceive,
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Delivery — ${order?.orderNumber || ''}`} maxWidth="max-w-xl">
      {order && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
            <strong>Restocking notice:</strong> Entered quantities will be added immediately to your inventory stock and logged as verified <span className="font-mono font-semibold">STOCK_IN</span> movements.
          </div>

          <Input
            label="Delivery Received Date"
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">Order Items to Receive</label>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
              {order.items.map((item) => {
                const remaining = item.quantityOrdered - item.quantityReceived
                const currentReceiving = receivingQuantities[item.id] || 0

                return (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-sm bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{item.product?.name || 'Product'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Ordered: {item.quantityOrdered} | Received so far: {item.quantityReceived} | <span className="font-medium text-amber-700">Remaining: {remaining}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Receive:</label>
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={currentReceiving}
                        disabled={remaining <= 0}
                        onChange={(e) => handleQuantityChange(item.id, remaining, parseInt(e.target.value) || 0)}
                        className="w-20 border rounded px-2 py-1 text-sm font-semibold text-center focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-gray-500">{item.product?.unit || 'pcs'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <Input
            label="Delivery Notes / Challan # (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Delivery challan #DC-9021, verified by storekeeper"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Confirm Delivery & Update Stock
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
