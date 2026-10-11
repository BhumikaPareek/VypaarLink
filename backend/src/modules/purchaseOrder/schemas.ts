import { z } from 'zod'

export const purchaseOrderItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantityOrdered: z.coerce.number().int().positive('Quantity ordered must be a positive integer'),
  unitCost: z.coerce.number().nonnegative('Unit cost cannot be negative').max(9999999.99),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(purchaseOrderItemInputSchema).min(1, 'At least one product item is required'),
})

export const updatePurchaseOrderSchema = z.object({
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z.array(purchaseOrderItemInputSchema).min(1).optional(),
})

export const recordGoodsReceiptSchema = z.object({
  receivedDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().uuid(),
    quantityReceived: z.coerce.number().int().positive('Quantity received must be a positive integer'),
  })).min(1, 'At least one item must be received'),
})

export const recordSupplierPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero').max(9999999.99),
  paymentDate: z.coerce.date().optional(),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
})
