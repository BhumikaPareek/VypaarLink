/**
 * layouts/AdminShell.tsx — Protected layout for Platform Administration
 */

import { useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '@/store/AdminAuthContext'

export default function AdminShell() {
  const { adminUser, logout } = useAdminAuth()
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
      navigate('/admin/login', { replace: true })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const maskedPhone = adminUser?.phone
    ? `******${adminUser.phone.slice(-4)}`
    : ''

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top Navbar */}
      <header className="bg-primary-dark text-white border-b border-primary shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Portal Tag */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-tangerine" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                <span className="text-lg font-bold tracking-tight">VypaarLink</span>
              </div>
              <span className="bg-emerald-950/80 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-700/50">
                Platform Admin
              </span>
            </div>

            {/* Admin identity & Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-white">{adminUser?.name || 'Platform Administrator'}</span>
                <span className="text-xs text-primary-light">{maskedPhone}</span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-emerald-700 text-white transition-colors border border-emerald-600/40 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoggingOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
