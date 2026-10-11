import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreatePurchaseOrderModal } from '@/features/purchaseOrders/CreatePurchaseOrderModal'
import { RecordDeliveryModal } from '@/features/purchaseOrders/RecordDeliveryModal'
import { RecordSupplierPaymentModal } from '@/features/purchaseOrders/RecordSupplierPaymentModal'
import { PurchaseOrderDetailsModal } from '@/features/purchaseOrders/PurchaseOrderDetailsModal'
import {
  apiGetPurchaseOrders,
  apiGetSuppliers,
  apiPlacePurchaseOrder,
  apiCancelPurchaseOrder,
  apiGetSupplierStats,
} from '@/api/suppliers'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import type { PurchaseOrder } from '@/types/supplier'

const STATUS_FILTERS = [
  { value: 'all', label: 'All Orders' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const statusBadgeVariants: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  PLACED: 'info',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'danger',
}

export function PurchaseOrdersPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [search, setSearch] = useState('')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null)
  const [deliveryOrder, setDeliveryOrder] = useState<PurchaseOrder | null>(null)
  const [paymentOrder, setPaymentOrder] = useState<PurchaseOrder | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: apiGetSupplierStats,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'filter-list'],
    queryFn: () => apiGetSuppliers(),
  })

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter, supplierFilter, search],
    queryFn: () =>
      apiGetPurchaseOrders({
        status: statusFilter,
        supplierId: supplierFilter || undefined,
        search: search || undefined,
      }),
  })

  const placeMutation = useMutation({
    mutationFn: apiPlacePurchaseOrder,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      toast(`Purchase order ${res.purchaseOrder.orderNumber} placed with supplier`, 'success')
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to place order', 'error')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: apiCancelPurchaseOrder,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      toast(`Purchase order ${res.purchaseOrder.orderNumber} cancelled`, 'success')
      setCancelConfirmId(null)
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to cancel order', 'error')
    },
  })

  const orders = ordersData?.purchaseOrders || []
  const suppliers = suppliersData?.suppliers || []
  const stats = statsData

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Purchase Orders</h1>
          <p className="text-text-muted text-sm mt-1">Order inventory from suppliers, record deliveries, and track payments.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Purchase Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Open Orders"
          value={statsLoading ? '—' : String(stats?.openOrdersCount ?? 0)}
          sublabel="Awaiting completion"
          accent="prominent"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Deliveries"
          value={statsLoading ? '—' : String(stats?.pendingDeliveriesCount ?? 0)}
          accent="warning"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
            </svg>
          }
        />
        <StatCard
          label="Total Suppliers"
          value={statsLoading ? '—' : String(stats?.totalSuppliers ?? 0)}
          accent="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Supplier Outstanding"
          value={statsLoading ? '—' : formatCurrency(stats?.totalOutstanding ?? '0')}
          accent="danger"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by PO # or supplier name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Supplier</label>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {ordersLoading ? (
          <div className="p-8 text-center text-gray-500">Loading purchase orders...</div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title={search || supplierFilter || statusFilter !== 'all' ? 'No orders match your filters' : 'No purchase orders yet'}
            description={
              search || supplierFilter || statusFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Create your first purchase order to order stock from your suppliers.'
            }
            action={
              !search && !supplierFilter && statusFilter === 'all'
                ? { label: 'Create Purchase Order', onClick: () => setIsCreateOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">PO # & Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => {
                  const total = parseFloat(order.totalAmount)
                  const paid = parseFloat(order.paidAmount)
                  const balance = Math.max(0, total - paid)

                  const canReceive = order.status === 'PLACED' || order.status === 'PARTIALLY_RECEIVED'
                  const canPay = order.status !== 'CANCELLED' && balance > 0

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 font-mono text-sm">{order.orderNumber}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.orderDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{order.supplier.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{order.items.length} product items</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusBadgeVariants[order.status] || 'neutral'} label={order.status.replace('_', ' ')} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="text-gray-700">
                          Paid: <span className="font-semibold text-green-700">{formatCurrency(order.paidAmount)}</span>
                        </div>
                        {balance > 0 ? (
                          <div className="text-red-600 font-medium mt-0.5">Due: {formatCurrency(balance)}</div>
                        ) : (
                          <div className="text-emerald-700 font-semibold mt-0.5">Fully Paid</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setDetailsOrderId(order.id)}
                            className="text-xs text-primary hover:text-primary-dark font-medium hover:underline"
                          >
                            Details
                          </button>

                          {order.status === 'DRAFT' && (
                            <button
                              onClick={() => placeMutation.mutate(order.id)}
                              disabled={placeMutation.isPending}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                            >
                              Place Order
                            </button>
                          )}

                          {canReceive && (
                            <button
                              onClick={() => setDeliveryOrder(order)}
                              className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-2 py-0.5 rounded font-semibold border border-emerald-200"
                            >
                              Record Delivery
                            </button>
                          )}

                          {canPay && (
                            <button
                              onClick={() => setPaymentOrder(order)}
                              className="text-xs text-amber-700 hover:text-amber-900 font-semibold hover:underline"
                            >
                              Pay Supplier
                            </button>
                          )}

                          {order.status === 'DRAFT' || order.status === 'PLACED' ? (
                            cancelConfirmId === order.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => cancelMutation.mutate(order.id)}
                                  disabled={cancelMutation.isPending}
                                  className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded font-medium"
                                >
                                  {cancelMutation.isPending ? '...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setCancelConfirmId(null)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setCancelConfirmId(order.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                              >
                                Cancel Order
                              </button>
                            )
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreatePurchaseOrderModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <PurchaseOrderDetailsModal isOpen={!!detailsOrderId} onClose={() => setDetailsOrderId(null)} orderId={detailsOrderId} />
      <RecordDeliveryModal isOpen={!!deliveryOrder} onClose={() => setDeliveryOrder(null)} order={deliveryOrder} />
      <RecordSupplierPaymentModal isOpen={!!paymentOrder} onClose={() => setPaymentOrder(null)} order={paymentOrder} />
    </div>
  )
}
