/**
 * store/AdminAuthContext.tsx — Global authentication state for Platform Administrator
 *
 * Isolated from the shopkeeper/customer AuthContext.
 * Reads the separate 'admin_token' cookie via GET /api/v1/admin/auth/me.
 * Never stores authentication tokens in localStorage or sessionStorage.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { apiAdminGetMe, apiAdminLogout, apiAdminLogin, type AdminLoginPayload } from '@/api/admin'
import type { User } from '@/types/auth'

type AdminAuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AdminAuthContextValue = {
  adminUser: User | null
  status: AdminAuthStatus
  login: (payload: AdminLoginPayload) => Promise<User>
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUserState] = useState<User | null>(null)
  const [status, setStatus] = useState<AdminAuthStatus>('loading')

  useEffect(() => {
    let isMounted = true
    apiAdminGetMe()
      .then((user) => {
        if (!isMounted) return
        if (user && user.role === 'PLATFORM_ADMIN') {
          setAdminUserState(user)
          setStatus('authenticated')
        } else {
          setAdminUserState(null)
          setStatus('unauthenticated')
        }
      })
      .catch(() => {
        if (!isMounted) return
        setAdminUserState(null)
        setStatus('unauthenticated')
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (payload: AdminLoginPayload) => {
    const res = await apiAdminLogin(payload)
    setAdminUserState(res.user)
    setStatus('authenticated')
    return res.user
  }, [])

  const logout = useCallback(async () => {
    await apiAdminLogout()
    setAdminUserState(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AdminAuthContext.Provider value={{ adminUser, status, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return ctx
}
