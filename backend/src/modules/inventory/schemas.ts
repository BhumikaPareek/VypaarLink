import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200),
  sku: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  price: z.coerce.number().nonnegative('Price must be non-negative').max(9999999.99),
  quantity: z.coerce.number().int().nonnegative('Quantity cannot be negative').default(0),
  unit: z.string().trim().max(50).default('pcs'),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
})

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(200).optional(),
  sku: z.string().trim().max(100).optional().nullable(),
  category: z.string().trim().max(100).optional().nullable(),
  price: z.coerce.number().nonnegative('Price must be non-negative').max(9999999.99).optional(),
  unit: z.string().trim().max(50).optional(),
  lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
})

export const adjustStockSchema = z.object({
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
  note: z.string().trim().max(500).optional(),
})
