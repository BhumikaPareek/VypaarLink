import { z } from 'zod'

export const createCreditSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.coerce.number().positive('Amount must be positive').max(9999999.99),
  note: z.string().trim().max(500).optional(),
  transactionDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
})

export const createPaymentSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.coerce.number().positive('Amount must be positive').max(9999999.99),
  note: z.string().trim().max(500).optional(),
  transactionDate: z.coerce.date().optional(),
  paymentMethod: z.string().trim().max(100).optional(),
  reference: z.string().trim().max(100).optional(),
})

export const flagTransactionSchema = z.object({
  flagReason: z.string().trim().min(1).max(500)
})
