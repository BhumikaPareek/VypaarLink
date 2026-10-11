import { z } from 'zod'

export const addCustomerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Valid 10-digit Indian mobile number required'),
})

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2).max(100)
})
