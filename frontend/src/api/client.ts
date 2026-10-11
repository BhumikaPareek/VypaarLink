import type { ApiError } from '@/types/auth'

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })

  const json = await res.json()

  if (!res.ok) {
    const err = json as ApiError
    throw err
  }

  return json.data as T
}
