/**
 * modules/auth/schemas.ts — Zod validation schemas for auth endpoints
 *
 * Defines the shape and rules for registration and login request bodies.
 * Zod validates at runtime; the inferred types give us compile-time safety.
 */

import { z } from 'zod'

// ── Register ──────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or fewer'),

  // Phone is the primary identifier for VypaarLink (India-focused product)
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(
      /^[6-9]\d{9}$/,
      'Enter a valid 10-digit Indian mobile number (starts with 6–9)'
    ),

  // Email is optional — many kirana shopkeepers don't use email
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('')),

  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be 72 characters or fewer'), // bcrypt max

  role: z.enum(['SHOPKEEPER', 'CUSTOMER'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be SHOPKEEPER or CUSTOMER',
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  // Users log in with their phone number
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(1, 'Phone number is required'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>
export const sendOtpSchema = z.object({
  intent: z.enum(['REGISTER_SHOPKEEPER', 'CUSTOMER_LOGIN']).optional(),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(
      /^[6-9]\d{9}$/,
      'Enter a valid 10-digit Indian mobile number'
    ),
})
export type SendOtpInput = z.infer<typeof sendOtpSchema>

export const verifyRegisterSchema = registerSchema.extend({
  otp: z.string().length(6, 'OTP must be exactly 6 digits')
})
export type VerifyRegisterInput = z.infer<typeof verifyRegisterSchema>

export const customerLoginSchema = z.object({
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits')
})
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>
