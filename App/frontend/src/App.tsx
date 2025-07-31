import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PetProfile from './pages/PetProfile';
import DeviceManager from './pages/DeviceManager';
import VideoMonitor from './pages/VideoMonitor';
import HealthMonitor from './pages/HealthMonitor';
import FeedingRecord from './pages/FeedingRecord';
import VaccineRecord from './pages/VaccineRecord';
import Reminders from './pages/Reminders';

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
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/pets" element={user ? <PetProfile /> : <Navigate to="/login" replace />} />
        <Route path="/devices" element={user ? <DeviceManager /> : <Navigate to="/login" replace />} />
        <Route path="/monitor" element={user ? <VideoMonitor /> : <Navigate to="/login" replace />} />
        <Route path="/health" element={user ? <HealthMonitor /> : <Navigate to="/login" replace />} />
        <Route path="/feeding" element={user ? <FeedingRecord /> : <Navigate to="/login" replace />} />
        <Route path="/vaccines" element={user ? <VaccineRecord /> : <Navigate to="/login" replace />} />
        <Route path="/reminders" element={user ? <Reminders /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;