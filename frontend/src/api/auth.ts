/**
 * api/auth.ts — Typed fetch functions for auth endpoints
 *
 * All API calls go through this file. Using fetch with 'credentials: include'
 * ensures the HttpOnly cookie is sent with every request (required for auth).
 *
 * Vite proxies /api → http://localhost:3000, so no CORS issues in dev.
 */

import type { User, ApiError } from '@/types/auth'

const BASE = '/api/v1/auth'

/** Generic fetch helper — throws ApiError on non-ok responses */
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send HttpOnly cookies with every request
    ...options,
  })

  const json = await res.json()

  if (!res.ok) {
    const err = json as ApiError
    throw err
  }

  return json.data as T
}

// ── Auth API functions ────────────────────────────────────────────────────────

export type SendOtpPayload = { phone: string, intent?: 'REGISTER_SHOPKEEPER' | 'CUSTOMER_LOGIN' }

export type RegisterPayload = {
  name: string
  phone: string
  email?: string
  password: string
  role: 'SHOPKEEPER' | 'CUSTOMER'
  otp: string
}

export type LoginPayload = {
  phone: string
  password: string
}

/** Register a new user — returns the created user */
export async function apiSendOtp(payload: SendOtpPayload): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`${BASE}/send-otp`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function apiRegister(payload: RegisterPayload): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(`${BASE}/verify-register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Log in with phone + password — returns the authenticated user */
export async function apiLogin(payload: LoginPayload): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(`${BASE}/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Fetch the current authenticated user.
 * Returns null if not authenticated (401) — does not throw.
 * Used on app load to restore session state.
 */
export async function apiGetMe(): Promise<User | null> {
  try {
    const data = await apiFetch<{ user: User }>(`${BASE}/me`)
    return data.user
  } catch {
    return null
  }
}

/** Log out — clears the HttpOnly cookie on the server */
export async function apiLogout(): Promise<void> {
  await fetch(`${BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export async function apiCustomerLogin(phone: string, otp: string): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/v1/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ phone, otp })
  })
}


