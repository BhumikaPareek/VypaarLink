import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuthContext } from '@/store/AuthContext'
import { useShop } from '@/store/ShopContext'

type NavItem = {
  label: string
  path: string
  icon: React.ReactNode
  available: boolean
}

function StoreIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function LedgerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function PaymentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="10" x2="23" y2="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BoxIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <rect x="1" y="3" width="15" height="13" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18.5" cy="18.5" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <StoreIcon />, available: true },
  { label: 'Customers', path: '/customers', icon: <UsersIcon />, available: true },
  { label: 'Transactions', path: '/transactions', icon: <LedgerIcon />, available: true },
  { label: 'Payments', path: '/payments', icon: <PaymentIcon />, available: true },
  { label: 'Inventory', path: '/inventory', icon: <BoxIcon />, available: true },
  { label: 'Suppliers', path: '/suppliers', icon: <TruckIcon />, available: true },
  { label: 'Purchase Orders', path: '/purchase-orders', icon: <LedgerIcon />, available: true },
  { label: 'Analytics', path: '/analytics', icon: <ChartIcon />, available: false },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthContext()
  const navigate = useNavigate()
  const { shop } = useShop()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const items = user?.role === 'CUSTOMER' ? [
    { label: 'Dashboard', path: '/dashboard', icon: <StoreIcon />, available: true },
  ] : NAV_ITEMS;

  return (
    <div className="flex flex-col h-full bg-primary-dark text-white">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-primary">
        <div className="text-white text-xl font-bold tracking-tight flex items-center gap-2">
          <svg className="w-6 h-6 text-tangerine" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          VypaarLink
        </div>
        <div className="text-primary-light text-xs mt-0.5 ml-8">
          {shop ? shop.name : (user?.role === 'CUSTOMER' ? 'Customer Account' : 'Business Companion')}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) =>
          item.available ? (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : 'text-primary-light hover:bg-primary hover:text-white',
                ].join(' ')
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ) : (
            <div
              key={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary opacity-40 cursor-default select-none"
              title="Coming soon"
            >
              {item.icon}
              <span>{item.label}</span>
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-primary-dark text-white/70 px-1.5 py-0.5 rounded">
                Soon
              </span>
            </div>
          )
        )}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-primary space-y-2">
        {user && (
          <div className="px-3 py-2.5 rounded-lg bg-primary shadow-inner">
            <div className="text-sm font-semibold text-white truncate">{user.name}</div>
            <div className="text-xs text-primary-light truncate mt-0.5">
              {user.role === 'SHOPKEEPER' ? 'Shopkeeper' : 'Customer'} • {user.phone}
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-light hover:bg-red-500 hover:text-white transition-colors duration-150"
        >
          <LogoutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )
}

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* ── Desktop sidebar (fixed, always visible ≥ lg) ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 xl:w-64 bg-primary-dark border-r border-primary flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar (slide-in drawer) ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="relative z-50 flex flex-col w-72 max-w-[85vw] h-full bg-primary-dark shadow-xl">
            <div className="flex justify-end px-4 py-3 border-b border-primary">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-primary-light hover:text-white"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main area: header + content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-bg">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border shadow-sm z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-gray-100"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <div className="text-primary text-lg font-bold">VypaarLink</div>
          <div className="w-8" /> {/* spacer */}
        </header>

        {/* Desktop header */}
        <header className="hidden lg:flex items-center justify-between px-6 py-4 bg-surface border-b border-border shadow-sm z-10">
          <h1 className="text-base font-semibold text-text">
            {/* Page title – populated by Outlet via context or page component */}
          </h1>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

