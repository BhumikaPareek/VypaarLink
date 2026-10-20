import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuthContext } from '@/store/AuthContext'
import { ShopProvider, useShop } from '@/store/ShopContext'
import AppShell from '@/layouts/AppShell'
import LoginPage from '@/features/auth/LoginPage'
import RegisterPage from '@/features/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { CustomerProfilePage } from '@/pages/CustomerProfilePage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { ShopSetupPage } from '@/pages/ShopSetupPage'
import { CustomerLedgerPage } from '@/pages/CustomerLedgerPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { SuppliersPage } from '@/pages/SuppliersPage'
import { PurchaseOrdersPage } from '@/pages/PurchaseOrdersPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { type ReactNode } from 'react'

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-3">
      <svg className="h-8 w-8 animate-spin text-green-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-sm text-gray-400">Loading VypaarLink…</span>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuthContext()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuthContext()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function ShopGuard({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const { shop, isLoading } = useShop();

  if (isLoading) return <FullPageSpinner />;
  
  if (user?.role === 'SHOPKEEPER' && !shop) {
    return <Navigate to="/shop/setup" replace />;
  }
  
  return <>{children}</>;
}

function RootRedirect() {
  const { status } = useAuthContext()
  if (status === 'loading') return <FullPageSpinner />
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

      <Route element={<ProtectedRoute><ShopProvider><Outlet /></ShopProvider></ProtectedRoute>}>
        <Route path="/shop/setup" element={<ShopSetupPage />} />
        
        <Route element={<ShopGuard><AppShell /></ShopGuard>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customer/ledger/:shopId" element={<CustomerLedgerPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:customerId" element={<CustomerProfilePage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center px-6">
            <div className="text-5xl">404</div>
            <h1 className="text-xl font-semibold text-gray-800">Page not found</h1>
            <a href="/dashboard" className="text-green-600 text-sm hover:underline">
              Go to Dashboard
            </a>
          </div>
        }
      />
    </Routes>
  )
}

import { ToastProvider } from '@/components/ui/Toast'

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}
