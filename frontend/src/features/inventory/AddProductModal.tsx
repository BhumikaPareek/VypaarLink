import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiCreateProduct } from '@/api/inventory'
import { useToast } from '@/components/ui/Toast'

type Props = {
  isOpen: boolean
  onClose: () => void
}

const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'dozen', 'box', 'pack', 'pair', 'roll', 'bag', 'bottle']

export function AddProductModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [unit, setUnit] = useState('pcs')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: apiCreateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast('Product added successfully', 'success')
      handleClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to add product')
    },
  })

  const handleClose = () => {
    setName('')
    setSku('')
    setCategory('')
    setPrice('')
    setQuantity('0')
    setUnit('pcs')
    setLowStockThreshold('5')
    setError('')
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Product name is required'); return }
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) { setError('Enter a valid price (0 or more)'); return }
    const qtyNum = parseInt(quantity)
    if (isNaN(qtyNum) || qtyNum < 0) { setError('Quantity cannot be negative'); return }
    const threshNum = parseInt(lowStockThreshold)
    if (isNaN(threshNum) || threshNum < 0) { setError('Low stock threshold cannot be negative'); return }

    setError('')
    mutation.mutate({
      name: name.trim(),
      sku: sku.trim() || undefined,
      category: category.trim() || undefined,
      price: priceNum,
      quantity: qtyNum,
      unit,
      lowStockThreshold: threshNum,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Product" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

        <Input
          label="Product Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Basmati Rice 5kg"
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SKU / Code (Optional)"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. RIC-001"
          />
          <Input
            label="Category (Optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Grains"
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
            placeholder="0.00"
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Opening Stock Quantity"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
          />
          <Input
            label="Low Stock Alert Threshold"
            type="number"
            min="0"
            step="1"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            placeholder="5"
            hint="Alert when stock falls to this level"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add Product
          </Button>
        </div>
      </form>
    </Modal>
  )
}
