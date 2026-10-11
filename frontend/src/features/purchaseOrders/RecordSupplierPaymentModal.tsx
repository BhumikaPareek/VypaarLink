import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiRecordSupplierPayment } from '@/api/suppliers'
import { formatCurrency } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import type { PurchaseOrder, SupplierPaymentMethod } from '@/types/supplier'

type Props = {
  isOpen: boolean
  onClose: () => void
  order: PurchaseOrder | null
}

const PAYMENT_METHODS: { value: SupplierPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / QR' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
  { value: 'OTHER', label: 'Cheque / Other' },
]

export function RecordSupplierPaymentModal({ isOpen, onClose, order }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<SupplierPaymentMethod>('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const outstandingBalance = order
    ? Math.max(0, parseFloat(order.totalAmount) - parseFloat(order.paidAmount))
    : 0

  useEffect(() => {
    if (order) {
      setAmount(outstandingBalance > 0 ? outstandingBalance.toFixed(2) : '')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentMethod('CASH')
      setReference('')
      setNotes('')
      setError('')
    }
  }, [order])

  const mutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      apiRecordSupplierPayment(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-order', order?.id] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      queryClient.invalidateQueries({ queryKey: ['supplier', order?.supplierId] })
      toast('Payment recorded successfully', 'success')
      onClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to record payment')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return

    const payVal = parseFloat(amount)
    if (isNaN(payVal) || payVal <= 0) {
      setError('Please enter a payment amount greater than zero.')
      return
    }

    if (payVal > outstandingBalance + 0.001) {
      setError(`Payment cannot exceed outstanding balance of ${formatCurrency(outstandingBalance)}.`)
      return
    }

    setError('')
    mutation.mutate({
      orderId: order.id,
      data: {
        amount: payVal,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : undefined,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Supplier Payment — ${order?.orderNumber || ''}`} maxWidth="max-w-md">
      {order && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

          {/* Balance card */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs flex justify-between items-center">
            <div>
              <div className="text-gray-500">Supplier: <span className="font-semibold text-gray-800">{order.supplier.name}</span></div>
              <div className="text-gray-500 mt-0.5">Total Order: {formatCurrency(order.totalAmount)}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500">Outstanding:</div>
              <div className="text-base font-bold text-red-600">{formatCurrency(outstandingBalance)}</div>
            </div>
          </div>

          <Input
            label="Payment Amount (₹)"
            type="number"
            step="0.01"
            min="0.01"
            max={outstandingBalance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as SupplierPaymentMethod)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Transaction Ref / UTR / Cheque # (Optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. UPI Ref: 312384910291"
          />

          <Input
            label="Payment Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid in full on delivery"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Record Payment
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
