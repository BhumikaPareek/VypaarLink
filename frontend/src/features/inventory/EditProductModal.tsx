import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiUpdateProduct } from '@/api/inventory'
import { useToast } from '@/components/ui/Toast'
import type { Product } from '@/types/inventory'

type Props = {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'dozen', 'box', 'pack', 'pair', 'roll', 'bag', 'bottle']

export function EditProductModal({ isOpen, onClose, product }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setName(product.name)
      setSku(product.sku ?? '')
      setCategory(product.category ?? '')
      setPrice(parseFloat(product.price).toString())
      setUnit(product.unit)
      setLowStockThreshold(product.lowStockThreshold.toString())
      setError('')
    }
  }, [product])

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiUpdateProduct>[1] }) =>
      apiUpdateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      toast('Product updated', 'success')
      onClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update product')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!name.trim()) { setError('Product name is required'); return }
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) { setError('Enter a valid price'); return }
    const threshNum = parseInt(lowStockThreshold)
    if (isNaN(threshNum) || threshNum < 0) { setError('Threshold cannot be negative'); return }

    setError('')
    mutation.mutate({
      id: product.id,
      data: {
        name: name.trim(),
        sku: sku.trim() || null,
        category: category.trim() || null,
        price: priceNum,
        unit,
        lowStockThreshold: threshNum,
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Product" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

        <Input
          label="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SKU / Code (Optional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <Input
            label="Category (Optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Selling Price (₹)"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <Input
          label="Low Stock Alert Threshold"
          type="number"
          min="0"
          step="1"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          hint="Alert shown when quantity falls to or below this level"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}
