import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { apiGetPurchaseOrder } from '@/api/suppliers'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { PurchaseOrder } from '@/types/supplier'

type Props = {
  isOpen: boolean
  onClose: () => void
  orderId: string | null
}

const statusBadgeVariants: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  PLACED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
}

export function PurchaseOrderDetailsModal({ isOpen, onClose, orderId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-order', orderId],
    queryFn: () => apiGetPurchaseOrder(orderId!),
    enabled: isOpen && !!orderId,
  })

  const order: PurchaseOrder | undefined = data?.purchaseOrder
  const receipts = order?.receipts || []
  const payments = order?.payments || []

  const outstandingBalance = order
    ? Math.max(0, parseFloat(order.totalAmount) - parseFloat(order.paidAmount))
    : 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Purchase Order Details — ${order?.orderNumber || ''}`} maxWidth="max-w-3xl">
      {isLoading ? (
        <div className="p-8 text-center text-sm text-gray-500">Loading order details...</div>
      ) : order ? (
        <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Summary Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 font-mono">{order.orderNumber}</h3>
                  <Badge variant={statusBadgeVariants[order.status] || 'neutral'} label={order.status.replace('_', ' ')} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ordered on {formatDateTime(order.orderDate)} • Supplier: <strong className="text-gray-800">{order.supplier.name}</strong>
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-500">Total Order Amount</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount)}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Paid: <span className="font-semibold text-green-700">{formatCurrency(order.paidAmount)}</span> | Balance: <span className="font-semibold text-red-600">{formatCurrency(outstandingBalance)}</span>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="text-xs text-gray-600 bg-white p-2.5 rounded border border-gray-200">
                <span className="font-semibold text-gray-700">Notes: </span>
                {order.notes}
              </div>
            )}
          </div>

          {/* Ordered Line Items */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">Order Line Items</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 font-medium text-gray-600">Product</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Ordered</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Received</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600">Unit Cost</th>
                    <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-gray-900">
                        {item.product?.name || 'Product'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {item.quantityOrdered} {item.product?.unit || 'pcs'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-semibold ${
                          item.quantityReceived >= item.quantityOrdered
                            ? 'text-green-700'
                            : item.quantityReceived > 0
                            ? 'text-amber-700'
                            : 'text-gray-400'
                        }`}>
                          {item.quantityReceived} / {item.quantityOrdered}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{formatCurrency(item.unitCost)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery Receiving History */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2 flex justify-between items-center">
              <span>Goods Receipts (Deliveries)</span>
              <span className="text-xs font-normal text-gray-500">{receipts.length} deliveries</span>
            </h4>

            {receipts.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg text-center border border-dashed">
                No deliveries recorded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {receipts.map((rcpt: any) => (
                  <div key={rcpt.id} className="bg-white border border-gray-200 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-gray-500">
                      <span className="font-semibold text-gray-800">Delivered on {formatDateTime(rcpt.receivedDate)}</span>
                      {rcpt.notes && <span className="italic text-gray-500">{rcpt.notes}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                      {rcpt.items?.map((ri: any) => (
                        <span key={ri.id} className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-medium">
                          +{ri.quantityReceived} {ri.product?.unit || 'pcs'} of {ri.product?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments Recorded */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2 flex justify-between items-center">
              <span>Payments Recorded Against this Order</span>
              <span className="text-xs font-normal text-gray-500">{payments.length} payments</span>
            </h4>

            {payments.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg text-center border border-dashed">
                No payments recorded yet for this order.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 font-medium text-gray-600">Date</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Method</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Reference / Notes</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((pm: any) => (
                      <tr key={pm.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(pm.paymentDate)}</td>
                        <td className="px-3 py-2 font-semibold text-gray-700">{pm.paymentMethod}</td>
                        <td className="px-3 py-2 text-gray-600">{pm.reference || pm.notes || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-green-700">{formatCurrency(pm.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
