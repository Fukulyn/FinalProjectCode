import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user } = useAuthStore();
  const location = useLocation();

  // 如果用戶未登入且不在公開頁面，重定向到登入頁面
  if (!user && 
      location.pathname !== '/login' && 
      location.pathname !== '/reset-password' &&
      !location.pathname.startsWith('/reset-password')) {
    return <Navigate to="/login" replace />;
  }

  // 如果用戶已登入且在登入頁面，重定向到首頁
  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
