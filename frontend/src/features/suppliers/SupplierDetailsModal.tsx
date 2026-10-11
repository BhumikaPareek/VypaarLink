import { useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiGetSupplier } from '@/api/suppliers'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { Supplier } from '@/types/supplier'

type Props = {
  isOpen: boolean
  onClose: () => void
  supplier: Supplier | null
}

const statusBadgeVariants: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  PLACED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
}

export function SupplierDetailsModal({ isOpen, onClose, supplier }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['supplier', supplier?.id],
    queryFn: () => apiGetSupplier(supplier!.id),
    enabled: isOpen && !!supplier,
  })

  const fullSupplier = data?.supplier
  const orders = fullSupplier?.purchaseOrders || []
  const payments = fullSupplier?.payments || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supplier Details" maxWidth="max-w-2xl">
      {supplier && (
        <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{supplier.name}</h3>
                {supplier.contactPerson && (
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Contact: {supplier.contactPerson}</p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {supplier.isActive ? 'Active' : 'Archived'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-200">
              <div>
                <span className="font-semibold text-gray-700">Phone: </span>
                {supplier.phone || '—'}
              </div>
              <div>
                <span className="font-semibold text-gray-700">Email: </span>
                {supplier.email || '—'}
              </div>
              <div>
                <span className="font-semibold text-gray-700">GSTIN: </span>
                {supplier.gstin ? <span className="font-mono">{supplier.gstin}</span> : '—'}
              </div>
              <div>
                <span className="font-semibold text-gray-700">Address: </span>
                {supplier.address || '—'}
              </div>
            </div>

            {supplier.notes && (
              <div className="text-xs text-gray-600 bg-white p-2.5 rounded border border-gray-200">
                <span className="font-semibold text-gray-700">Notes: </span>
                {supplier.notes}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
              <span>Recent Purchase Orders</span>
              <span className="text-xs font-normal text-gray-500">{orders.length} orders</span>
            </h4>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                title="No purchase orders"
                description="No purchase orders recorded for this supplier yet."
              />
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 font-medium text-gray-600">PO #</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Date</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Total</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900 font-mono">{po.orderNumber}</td>
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(po.orderDate)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={statusBadgeVariants[po.status] || 'neutral'} label={po.status.replace('_', ' ')} />
                        </td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{formatCurrency(po.totalAmount)}</td>
                        <td className="px-3 py-2 text-gray-700">{formatCurrency(po.paidAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center justify-between">
              <span>Recent Payments to Supplier</span>
              <span className="text-xs font-normal text-gray-500">{payments.length} payments</span>
            </h4>

            {isLoading ? (
              <div className="p-4 text-center text-xs text-gray-500">Loading payments...</div>
            ) : payments.length === 0 ? (
              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg text-center border border-dashed">
                No payments recorded for this supplier yet.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 font-medium text-gray-600">Date</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Method</th>
                      <th className="px-3 py-2 font-medium text-gray-600">Reference / Note</th>
                      <th className="px-3 py-2 font-medium text-gray-600 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((pm: any) => (
                      <tr key={pm.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500">{formatDateTime(pm.paymentDate)}</td>
                        <td className="px-3 py-2 font-medium text-gray-700">{pm.paymentMethod}</td>
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
      )}
    </Modal>
  )
}
