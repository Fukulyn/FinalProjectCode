import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PetProfile from './pages/PetProfile';
import HealthMonitor from './pages/HealthMonitor';
import FeedingRecord from './pages/FeedingRecord';
import VaccineRecord from './pages/VaccineRecord';
import { subscribeUserToPush } from './lib/firebase';

function App() {
  const { checkAuth, loading, user } = useAuthStore();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    // 模擬初始載入時間
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
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

  if (initialLoading) {
    return <LoadingScreen />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {user ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pets" element={<PetProfile />} />
            <Route path="/health" element={<HealthMonitor />} />
            <Route path="/feeding" element={<FeedingRecord />} />
            <Route path="/vaccines" element={<VaccineRecord />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;