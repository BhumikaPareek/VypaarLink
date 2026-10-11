// Types for VypaarLink Inventory Management (Stage 2)

export type StockMovementType = 'OPENING_STOCK' | 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'SALE'

export interface Product {
  id: string
  shopId: string
  name: string
  sku: string | null
  category: string | null
  price: string // Decimal serialized as string from Prisma
  quantity: number
  unit: string
  lowStockThreshold: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  productId: string
  shopId: string
  type: StockMovementType
  quantity: number
  note: string | null
  createdAt: string
}

export interface InventoryStats {
  totalProducts: number
  totalStockValue: string
  lowStockCount: number
  outOfStockCount: number
}

export type StockStatus = 'in_stock' | 'low' | 'out'

export function getStockStatus(product: Product): StockStatus {
  if (product.quantity === 0) return 'out'
  if (product.quantity <= product.lowStockThreshold) return 'low'
  return 'in_stock'
}
