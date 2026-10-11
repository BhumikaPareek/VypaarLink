/**
 * types/auth.ts — Shared TypeScript types for authentication
 *
 * These mirror the SafeUser type from the backend service.
 * Keeping types co-located with features makes them easy to find.
 */

export type UserRole = 'SHOPKEEPER' | 'CUSTOMER'

/** Safe user object returned by all auth endpoints — never includes passwordHash */
export type User = {
  id: string
  name: string
  phone: string
  email: string | null
  role: UserRole
  isActive: boolean
  createdAt: string // ISO date string from JSON
}

/** Standard API success response wrapper */
export type ApiSuccess<T> = {
  status: 'success'
  data: T
}

/** Standard API error response */
export type ApiError = {
  status: 'error'
  message: string
  errors?: { field: string; message: string }[]
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
