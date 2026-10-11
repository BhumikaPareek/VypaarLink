import { z } from 'zod'

export const setupShopSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile number').optional().or(z.literal('')),
})

export const updateShopSchema = setupShopSchema.partial()
