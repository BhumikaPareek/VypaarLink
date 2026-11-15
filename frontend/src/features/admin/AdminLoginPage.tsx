/**
 * features/admin/AdminLoginPage.tsx — Secure portal login for Platform Administrator
 *
 * Dedicated login page unlinked from public customer/shopkeeper auth routes.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAdminAuth } from '@/store/AdminAuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function AdminLoginPage() {
  const { status, login } = useAdminAuth()
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'authenticated') {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedPhone = phone.trim()
    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number (starts with 6–9).')
      return
    }

    if (!password) {
      setError('Password is required.')
      return
    }

    setIsLoading(true)
    try {
      await login({ phone: trimmedPhone, password })
      navigate('/admin/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your administrator credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-bg">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-dark text-white mb-4 shadow-md">
          <svg className="w-6 h-6 text-tangerine" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-text">Platform Administration</h2>
        <p className="mt-1 text-sm text-text-muted">
          Authorized personnel only. All access attempts are logged and monitored.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface py-8 px-6 shadow-sm border border-border rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <Input
              id="admin-phone"
              name="phone"
              type="tel"
              label="Admin Mobile Number"
              placeholder="10-digit mobile number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              maxLength={10}
            />

            <Input
              id="admin-password"
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5 bg-primary-dark hover:bg-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying Credentials…' : 'Access Administration Portal'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
