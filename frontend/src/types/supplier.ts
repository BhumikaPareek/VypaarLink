export interface Supplier {
  id: string
  shopId: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  gstin: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    purchaseOrders: number
    payments: number
  }
}

export interface SupplierStats {
  totalSuppliers: number
  openOrdersCount: number
  pendingDeliveriesCount: number
  totalOutstanding: string
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PLACED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'

export type SupplierPaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  quantityOrdered: number
  quantityReceived: number
  unitCost: string
  totalCost: string
  product?: {
    id: string
    name: string
    unit: string
    quantity?: number
    price?: string
  }
}

export interface GoodsReceiptItem {
  id: string
  goodsReceiptId: string
  purchaseOrderItemId: string
  productId: string
  quantityReceived: number
  product?: {
    id: string
    name: string
    unit: string
  }
}

export interface GoodsReceipt {
  id: string
  purchaseOrderId: string
  shopId: string
  receivedDate: string
  notes: string | null
  createdAt: string
  items?: GoodsReceiptItem[]
}

export interface SupplierPayment {
  id: string
  shopId: string
  supplierId: string
  purchaseOrderId: string | null
  amount: string
  paymentDate: string
  paymentMethod: SupplierPaymentMethod
  reference: string | null
  notes: string | null
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  shopId: string
  supplierId: string
  orderNumber: string
  orderDate: string
  expectedDate: string | null
  status: PurchaseOrderStatus
  totalAmount: string
  paidAmount: string
  notes: string | null
  createdAt: string
  updatedAt: string
  supplier: {
    id: string
    name: string
    phone: string | null
    email?: string | null
    contactPerson?: string | null
  }
  items: PurchaseOrderItem[]
  receipts?: GoodsReceipt[]
  payments?: SupplierPayment[]
  _count?: {
    receipts: number
    payments: number
  }
}
