/**
 * modules/admin/auth/schemas.ts — Zod validation schemas for Platform Admin auth
 */

import { z } from 'zod'

export const adminLoginSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(
      /^[6-9]\d{9}$/,
      'Enter a valid 10-digit Indian mobile number (starts with 6–9)'
    ),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
})

export type AdminLoginInput = z.infer<typeof adminLoginSchema>
