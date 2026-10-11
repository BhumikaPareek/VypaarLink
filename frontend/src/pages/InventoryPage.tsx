import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { AddProductModal } from '@/features/inventory/AddProductModal'
import { EditProductModal } from '@/features/inventory/EditProductModal'
import { AdjustStockModal } from '@/features/inventory/AdjustStockModal'
import { StockMovementsModal } from '@/features/inventory/StockMovementsModal'
import { apiGetInventoryStats, apiGetProducts, apiArchiveProduct, apiRestoreProduct } from '@/api/inventory'
import { formatCurrency } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'
import type { Product } from '@/types/inventory'
import { getStockStatus } from '@/types/inventory'

type ViewTab = 'active' | 'archived'
type FilterStock = 'all' | 'low' | 'out'

export function InventoryPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<ViewTab>('active')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState<FilterStock>('all')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [movementsProduct, setMovementsProduct] = useState<Product | null>(null)
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null)
  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null)

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: apiGetInventoryStats,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['inventory', activeTab, search, categoryFilter, stockFilter],
    queryFn: () =>
      apiGetProducts({
        search: search || undefined,
        category: categoryFilter || undefined,
        stockStatus: stockFilter === 'all' ? undefined : stockFilter,
        isActive: activeTab === 'active',
      }),
  })

  // Also query count of archived products for tab badge
  const { data: archivedData } = useQuery({
    queryKey: ['inventory-archived-count'],
    queryFn: () => apiGetProducts({ isActive: false }),
  })
  const archivedCount = archivedData?.products.length ?? 0

  const archiveMutation = useMutation({
    mutationFn: apiArchiveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-archived-count'] })
      toast('Product archived successfully', 'success')
      setArchiveConfirmId(null)
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to archive product', 'error')
    },
  })

  const restoreMutation = useMutation({
    mutationFn: apiRestoreProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-archived-count'] })
      toast('Product restored to active inventory', 'success')
      setRestoreConfirmId(null)
    },
    onError: (err: any) => {
      toast(err.message || 'Failed to restore product', 'error')
    },
  })

  const products = productsData?.products ?? []
  const stats = statsData

  // Gather unique categories from loaded products
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[]

  function getStockBadge(product: Product) {
    const status = getStockStatus(product)
    if (status === 'out') return <Badge variant="danger" label="Out of Stock" />
    if (status === 'low') return <Badge variant="warning" label={`Low (${product.quantity})`} />
    return <Badge variant="success" label={`${product.quantity} ${product.unit}`} />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Inventory</h1>
          <p className="text-text-muted text-sm mt-1">Manage products, track stock, and record adjustments.</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Products"
          value={statsLoading ? '—' : String(stats?.totalProducts ?? 0)}
          accent="neutral"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          }
        />
        <StatCard
          label="Inventory Value"
          value={statsLoading ? '—' : formatCurrency(stats?.totalStockValue ?? '0')}
          accent="prominent"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Low Stock"
          value={statsLoading ? '—' : String(stats?.lowStockCount ?? 0)}
          sublabel="Need restocking soon"
          accent="warning"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <StatCard
          label="Out of Stock"
          value={statsLoading ? '—' : String(stats?.outOfStockCount ?? 0)}
          accent="danger"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
      </div>

      {/* Tabs: Active vs Archived Products */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          type="button"
          onClick={() => { setActiveTab('active'); setSearch(''); setCategoryFilter(''); setStockFilter('all'); }}
          className={`pb-3 font-semibold text-sm transition-colors relative ${
            activeTab === 'active'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Active Products
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('archived'); setSearch(''); setCategoryFilter(''); setStockFilter('all'); }}
          className={`pb-3 font-semibold text-sm transition-colors flex items-center gap-2 relative ${
            activeTab === 'archived'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>Archived Products</span>
          {archivedCount > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              activeTab === 'archived' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
            }`}>
              {archivedCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder={`Search ${activeTab === 'archived' ? 'archived' : ''} products by name...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[150px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        {activeTab === 'active' && (
          <div className="flex gap-2">
            {(['all', 'low', 'out'] as FilterStock[]).map((f) => (
              <button
                key={f}
                onClick={() => setStockFilter(f)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  stockFilter === f
                    ? 'bg-primary text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? 'All Stock' : f === 'low' ? '⚠️ Low' : '🔴 Out'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {productsLoading ? (
          <div className="p-8 text-center text-gray-500">Loading {activeTab === 'archived' ? 'archived products' : 'inventory'}...</div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg>
            }
            title={
              activeTab === 'archived'
                ? search || categoryFilter ? 'No archived products match your filters' : 'No archived products'
                : search || categoryFilter || stockFilter !== 'all' ? 'No products match your filters' : 'No products yet'
            }
            description={
              activeTab === 'archived'
                ? 'Archived products will appear here. You can restore them to active inventory at any time.'
                : search || categoryFilter || stockFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Add your first product to start managing inventory.'
            }
            action={
              activeTab === 'active' && !search && !categoryFilter && stockFilter === 'all'
                ? { label: 'Add Product', onClick: () => setIsAddOpen(true) }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category / SKU</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">per {product.unit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{product.category || <span className="text-gray-400">—</span>}</div>
                      {product.sku && <div className="text-xs text-gray-400 mt-0.5 font-mono">{product.sku}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStockBadge(product)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.isActive ? (
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
                        {product.isActive ? (
                          <>
                            <button
                              onClick={() => setAdjustProduct(product)}
                              className="text-xs text-primary hover:text-primary-dark font-medium hover:underline"
                            >
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => setMovementsProduct(product)}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium hover:underline"
                            >
                              History
                            </button>
                            <button
                              onClick={() => setEditProduct(product)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              Edit
                            </button>
                            {archiveConfirmId === product.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => archiveMutation.mutate(product.id)}
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
                                onClick={() => setArchiveConfirmId(product.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                              >
                                Archive
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setMovementsProduct(product)}
                              className="text-xs text-gray-500 hover:text-gray-700 font-medium hover:underline"
                            >
                              History
                            </button>
                            {restoreConfirmId === product.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => restoreMutation.mutate(product.id)}
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
                                onClick={() => setRestoreConfirmId(product.id)}
                                className="text-xs text-primary hover:text-primary-dark font-semibold hover:underline"
                              >
                                Restore Product
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
      <AddProductModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <EditProductModal isOpen={!!editProduct} onClose={() => setEditProduct(null)} product={editProduct} />
      <AdjustStockModal isOpen={!!adjustProduct} onClose={() => setAdjustProduct(null)} product={adjustProduct} />
      <StockMovementsModal isOpen={!!movementsProduct} onClose={() => setMovementsProduct(null)} product={movementsProduct} />
    </div>
  )
}
