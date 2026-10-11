import React, { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiGetSuppliers, apiCreatePurchaseOrder } from '@/api/suppliers'
import { apiGetProducts } from '@/api/inventory'
import { formatCurrency } from '@/utils/format'
import { useToast } from '@/components/ui/Toast'

type Props = {
  isOpen: boolean
  onClose: () => void
}

interface OrderItemInput {
  productId: string
  name: string
  unit: string
  quantityOrdered: number
  unitCost: number
}

export function CreatePurchaseOrderModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<OrderItemInput[]>([])
  const [error, setError] = useState('')

  // Load active suppliers
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'active-for-po'],
    queryFn: () => apiGetSuppliers({ isActive: true }),
    enabled: isOpen,
  })

  // Load active inventory products
  const { data: productsData } = useQuery({
    queryKey: ['inventory', 'active-for-po'],
    queryFn: () => apiGetProducts({ isActive: true }),
    enabled: isOpen,
  })

  const suppliers = suppliersData?.suppliers ?? []
  const products = productsData?.products ?? []

  const mutation = useMutation({
    mutationFn: apiCreatePurchaseOrder,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      toast(`Purchase order ${res.purchaseOrder.orderNumber} created`, 'success')
      handleClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create purchase order')
    },
  })

  const handleClose = () => {
    setSupplierId('')
    setExpectedDate('')
    setNotes('')
    setItems([])
    setError('')
    onClose()
  }

  const handleAddProduct = (productId: string) => {
    if (!productId) return
    const product = products.find((p) => p.id === productId)
    if (!product) return

    const existing = items.find((i) => i.productId === productId)
    if (existing) {
      setItems(items.map((i) => (i.productId === productId ? { ...i, quantityOrdered: i.quantityOrdered + 1 } : i)))
    } else {
      setItems([
        ...items,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          quantityOrdered: 1,
          unitCost: parseFloat(product.price) || 0,
        },
      ])
    }
    setError('')
  }

  const handleUpdateItem = (productId: string, field: 'quantityOrdered' | 'unitCost', value: number) => {
    setItems(
      items.map((i) => {
        if (i.productId === productId) {
          return { ...i, [field]: value }
        }
        return i
      })
    )
  }

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId))
  }

  const calculatedTotal = items.reduce((sum, item) => sum + item.unitCost * item.quantityOrdered, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId) {
      setError('Please select a supplier')
      return
    }
    if (items.length === 0) {
      setError('Please add at least one product to the purchase order')
      return
    }

    for (const item of items) {
      if (item.quantityOrdered <= 0) {
        setError(`Quantity for ${item.name} must be greater than zero`)
        return
      }
      if (item.unitCost < 0) {
        setError(`Unit cost for ${item.name} cannot be negative`)
        return
      }
    }

    setError('')
    mutation.mutate({
      supplierId,
      expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
      notes: notes.trim() || undefined,
      items: items.map((i) => ({
        productId: i.productId,
        quantityOrdered: i.quantityOrdered,
        unitCost: i.unitCost,
      })),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Purchase Order" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">Choose supplier...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Expected Delivery Date (Optional)"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>

        {/* Add Products Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Add Products to Order</label>
          <select
            value=""
            onChange={(e) => {
              handleAddProduct(e.target.value)
              e.target.value = ''
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          >
            <option value="">Choose product to add to PO...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit}) — Current Stock: {p.quantity}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Items Table */}
        {items.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 p-2 max-h-60 overflow-y-auto flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded border border-gray-200 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{item.name}</div>
                  <div className="text-xs text-gray-500">Unit: {item.unit}</div>
                </div>

                <div className="flex items-center gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase block">Qty</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantityOrdered}
                      onChange={(e) => handleUpdateItem(item.productId, 'quantityOrdered', parseInt(e.target.value) || 0)}
                      className="w-16 border rounded px-2 py-1 text-sm font-medium text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase block">Unit Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(e) => handleUpdateItem(item.productId, 'unitCost', parseFloat(e.target.value) || 0)}
                      className="w-24 border rounded px-2 py-1 text-sm font-medium text-right"
                    />
                  </div>

                  <div className="w-20 text-right font-semibold text-gray-900">
                    {formatCurrency(item.unitCost * item.quantityOrdered)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.productId)}
                    className="text-red-500 hover:text-red-700 p-1 text-xs font-bold"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center px-3 py-2 bg-white rounded border border-gray-200 font-bold text-sm">
              <span>Order Total:</span>
              <span className="text-primary text-base">{formatCurrency(calculatedTotal)}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-lg text-center border border-dashed border-gray-300">
            No products added yet. Select products from the dropdown above to build your order.
          </div>
        )}

        <Input
          label="Order Notes / Delivery Instructions (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Deliver to back gate, call on arrival"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending} disabled={items.length === 0}>
            Create Order (Draft)
          </Button>
        </div>
      </form>
    </Modal>
  )
}
