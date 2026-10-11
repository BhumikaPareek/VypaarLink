/**
 * store/AuthContext.tsx — Global authentication state
 *
 * Provides the current user, auth status, login/logout actions to the
 * entire application via React Context.
 *
 * On app load, it calls GET /api/v1/auth/me to restore an existing session.
 * While this check is in flight, status is 'loading' — used to prevent
 * flashing protected content before auth is confirmed.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { apiGetMe, apiLogout } from '@/api/auth'
import type { User } from '@/types/auth'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  user: User | null
  status: AuthStatus
  /** Call after a successful login/register API response */
  setUser: (user: User) => void
  /** Calls logout API and clears user state */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  // On mount: check for existing session via /me endpoint
  useEffect(() => {
    apiGetMe().then((fetchedUser) => {
      if (fetchedUser) {
        setUserState(fetchedUser)
        setStatus('authenticated')
      } else {
        setStatus('unauthenticated')
      }
    })
  }, [])

  const setUser = useCallback((newUser: User) => {
    setUserState(newUser)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUserState(null)
    setStatus('unauthenticated')
  }, [])

  return (
    <AuthContext.Provider value={{ user, status, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Hook to access auth context — throws if used outside AuthProvider */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
