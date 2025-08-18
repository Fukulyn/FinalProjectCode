import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import PetProfile from './pages/PetProfile';
import HealthMonitor from './pages/HealthMonitor';
import FeedingRecord from './pages/FeedingRecord';
import VaccineRecord from './pages/VaccineRecord';
import VaccineReminderSettings from './pages/VaccineReminderSettings';
import { subscribeUserToPush } from './lib/firebase';

function App() {
  const { checkAuth, loading, user } = useAuthStore();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // 總是執行認證檢查，但重設密碼頁面會有自己的處理邏輯
    checkAuth();
    
    // 縮短初始載入時間，避免重設密碼頁面卡太久
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  useEffect(() => {
    // 請求通知權限
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (user && user.id) {
      subscribeUserToPush(user.id);
    }
  }, [user]);

  // 如果在重設密碼頁面，跳過初始載入畫面
  const isResetPasswordPath = window.location.pathname === '/reset-password';
  
  if (initialLoading && !isResetPasswordPath) {
    return <LoadingScreen />;
  }

  if (loading && !isResetPasswordPath) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* 重設密碼頁面 - 獨立於認證系統 */}
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* 登入頁面 */}
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <Login />
        } />
        
        {/* 受保護的頁面 */}
        <Route path="/" element={
          user ? <Dashboard /> : <Navigate to="/login" replace />
        } />
        <Route path="/pets" element={
          user ? <PetProfile /> : <Navigate to="/login" replace />
        } />
        <Route path="/health" element={
          user ? <HealthMonitor /> : <Navigate to="/login" replace />
        } />
        <Route path="/feeding" element={
          user ? <FeedingRecord /> : <Navigate to="/login" replace />
        } />
        <Route path="/vaccines" element={
          user ? <VaccineRecord /> : <Navigate to="/login" replace />
        } />
        <Route path="/vaccine-reminder-settings" element={
          user ? <VaccineReminderSettings /> : <Navigate to="/login" replace />
        } />
        
        {/* 默認重定向 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;