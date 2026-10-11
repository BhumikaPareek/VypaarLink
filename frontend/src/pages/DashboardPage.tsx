import { useAuthContext } from '@/store/AuthContext';
import { CustomerDashboard } from '@/features/dashboard/CustomerDashboard';
import { ShopkeeperDashboard } from '@/features/dashboard/ShopkeeperDashboard';

export function DashboardPage() {
  const { user } = useAuthContext();
  
  if (user?.role === 'CUSTOMER') {
    return <CustomerDashboard />;
  }
  
  return <ShopkeeperDashboard />;
}
