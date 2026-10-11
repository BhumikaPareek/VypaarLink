import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddSupplierModal } from '@/features/suppliers/AddSupplierModal'
import { EditSupplierModal } from '@/features/suppliers/EditSupplierModal'
import { SupplierDetailsModal } from '@/features/suppliers/SupplierDetailsModal'
import { apiGetSupplierStats, apiGetSuppliers, apiArchiveSupplier, apiRestoreSupplier } from '@/api/suppliers'
import { formatCurrency } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import type { Supplier } from '@/types/supplier'

type ViewTab = 'active' | 'archived'

export function SuppliersPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<ViewTab>('active')
  const [search, setSearch] = useState('')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [detailsSupplier, setDetailsSupplier] = useState<Supplier | null>(null)
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null)
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: apiGetSupplierStats,
  })

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers', activeTab, search],
    queryFn: () =>
      apiGetSuppliers({
        search: search || undefined,
        isActive: activeTab === 'active',
      }),
  })

  const { data: archivedData } = useQuery({
    queryKey: ['suppliers-archived-count'],
    queryFn: () => apiGetSuppliers({ isActive: false }),
  })
  const archivedCount = archivedData?.suppliers.length ?? 0

  const archiveMutation = useMutation({
    mutationFn: apiArchiveSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers-archived-count'] })
      toast('Supplier archived successfully', 'success')
      setArchiveConfirmId(null)
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to archive supplier', 'error')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: apiRestoreSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers-archived-count'] })
      toast('Supplier restored to active suppliers', 'success')
      setRestoreConfirmId(null)
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to restore supplier', 'error')
    },
  })

  const suppliers = suppliersData?.suppliers ?? []
  const stats = statsData

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Suppliers</h1>
          <p className="text-text-muted text-sm mt-1">Manage wholesale vendors, track orders, and monitor payables.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Suppliers"
          value={statsLoading ? '—' : String(stats?.totalSuppliers ?? 0)}
          accent="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Open Purchase Orders"
          value={statsLoading ? '—' : String(stats?.openOrdersCount ?? 0)}
          sublabel="In progress"
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
          sublabel="Awaiting goods receipt"
          accent="warning"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
            </svg>
          }
        />
        <StatCard
          label="Supplier Outstanding"
          value={statsLoading ? '—' : formatCurrency(stats?.totalOutstanding ?? '0')}
          sublabel="Total payables"
          accent="danger"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Tabs: Active vs Archived */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          type="button"
          onClick={() => { setActiveTab('active'); setSearch(''); }}
          className={`pb-3 font-semibold text-sm transition-colors relative ${
            activeTab === 'active'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Active Suppliers
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('archived'); setSearch(''); }}
          className={`pb-3 font-semibold text-sm transition-colors flex items-center gap-2 relative ${
            activeTab === 'archived'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Archived Suppliers</span>
          {archivedCount > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              activeTab === 'archived' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
            }`}>
              {archivedCount}
            </span>
          )}
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex gap-4">
        <div className="flex-1">
          <Input
            placeholder={`Search ${activeTab === 'archived' ? 'archived' : ''} suppliers by name, contact, phone, or GSTIN...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {suppliersLoading ? (
          <div className="p-8 text-center text-gray-500">Loading {activeTab === 'archived' ? 'archived suppliers' : 'suppliers'}...</div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title={
              activeTab === 'archived'
                ? search ? 'No archived suppliers match your search' : 'No archived suppliers'
                : search ? 'No suppliers match your search' : 'No suppliers added yet'
            }
            description={
              activeTab === 'archived'
                ? 'Archived suppliers will appear here. You can restore them at any time.'
                : search
                ? 'Try adjusting your search terms.'
                : 'Add your primary wholesale vendors and distributors to start tracking orders.'
            }
            action={
              activeTab === 'active' && !search
                ? { label: 'Add Supplier', onClick: () => setIsAddOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">GSTIN</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 text-sm">{supplier.name}</div>
                      {supplier.address && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{supplier.address}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div>{supplier.phone || <span className="text-gray-400">—</span>}</div>
                      {supplier.contactPerson && (
                        <div className="text-xs text-gray-500">{supplier.contactPerson}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">
                      {supplier.gstin || <span className="text-gray-400 font-sans">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      {supplier._count?.purchaseOrders ?? 0} orders
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {supplier.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setDetailsSupplier(supplier)}
                          className="text-xs text-primary hover:text-primary-dark font-medium hover:underline"
                        >
                          View Details
                        </button>

                        {supplier.isActive ? (
                          <>
                            <button
                              onClick={() => setEditSupplier(supplier)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              Edit
                            </button>
                            {archiveConfirmId === supplier.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => archiveMutation.mutate(supplier.id)}
                                  disabled={archiveMutation.isPending}
                                  className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded font-medium"
                                >
                                  {archiveMutation.isPending ? '...' : 'Confirm'}
                                </button>
                                <button
                                  onClick={() => setArchiveConfirmId(null)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setArchiveConfirmId(supplier.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                              >
                                Archive
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {restoreConfirmId === supplier.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => restoreMutation.mutate(supplier.id)}
                                  disabled={restoreMutation.isPending}
                                  className="text-xs text-white bg-primary hover:bg-primary-dark px-2.5 py-0.5 rounded font-medium"
                                >
                                  {restoreMutation.isPending ? '...' : 'Confirm Restore'}
                                </button>
                                <button
                                  onClick={() => setRestoreConfirmId(null)}
                                  className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRestoreConfirmId(supplier.id)}
                                className="text-xs text-primary hover:text-primary-dark font-semibold hover:underline"
                              >
                                Restore Supplier
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddSupplierModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditSupplierModal isOpen={!!editSupplier} onClose={() => setEditSupplier(null)} supplier={editSupplier} />
      <SupplierDetailsModal isOpen={!!detailsSupplier} onClose={() => setDetailsSupplier(null)} supplier={detailsSupplier} />
    </div>
  )
}
