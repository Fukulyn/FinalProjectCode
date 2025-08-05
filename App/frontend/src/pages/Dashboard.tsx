import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { Heart, Utensils, Syringe, Bell, Home, Menu, PawPrint } from 'lucide-react'; // 導入 Menu 圖示
import { supabase } from '../lib/supabase';
import { VaccineRecord } from '../types';
import { subscribeUserToPush } from '../lib/firebase';

export default function Dashboard() {
  const { signOut, user } = useAuthStore();
  const [vaccineAlerts, setVaccineAlerts] = useState<VaccineRecord[]>([]);
  const [showAlertPopup, setShowAlertPopup] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false); // 新增的狀態，控制手機版導航顯示

  // 檢查疫苗即將到期
  useEffect(() => {
    async function checkVaccineReminders() {
      // 查詢疫苗紀錄並帶出寵物名稱
      const { data: records } = await supabase
        .from('vaccine_records')
        .select('*, pets(name)');
      const soon = (records || []).filter(r => {
        const dueDate = r.next_due_date ? new Date(r.next_due_date) : null;
        if (!dueDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // 標準化今天日期到午夜

        dueDate.setHours(0, 0, 0, 0); // 標準化到期日到午夜，以避免時區或時間問題

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // 只顯示 0-7 天內到期的疫苗
        return diffDays >= 0 && diffDays <= 7;
      });
      setVaccineAlerts(soon);
    }
    checkVaccineReminders();
  }, []);

  const menuItems = [
    {
      title: '寵物檔案',
      icon: <PawPrint className="w-6 h-6" />, // 使用 lucide-react 的 PawPrint 圖示
      description: '管理寵物基本資訊',
      link: '/pets',
      color: 'bg-blue-500',
    },
    {
      title: '健康監測',
      icon: <Heart className="w-6 h-6" />,
      description: '體溫、心率、血氧監測',
      link: '/health',
      color: 'bg-red-500',
    },
    {
      title: '餵食紀錄',
      icon: <Utensils className="w-6 h-6" />,
      description: '飲食紀錄與熱量計算',
      link: '/feeding',
      color: 'bg-green-500',
    },
    {
      title: '疫苗紀錄',
      icon: <Syringe className="w-6 h-6" />,
      description: '疫苗接種與提醒',
      link: '/vaccines',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>返回主頁</span>
              </Link>
            </div>

            {/* 導航項目 - 在小螢幕下隱藏，大螢幕下顯示 */}
            <div className="hidden md:flex items-center gap-4">
              {/* 右上方小鈴鐺 */}
              <button className="relative p-2 rounded-full hover:bg-gray-100" onClick={() => setShowAlertPopup(true)}>
                <Bell className="w-6 h-6 text-gray-700" />
                {vaccineAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                    !
                  </span>
                )}
              </button>
              {/* 新增 Web Push 訂閱按鈕 */}
              <button
                className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 ml-2"
                onClick={() => user && subscribeUserToPush(user.id)}
                title="訂閱推播通知"
              >
                <Bell className="w-5 h-5 inline-block mr-1" />
                訂閱通知
              </button>
              <span className="mr-4 text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                登出
              </button>
            </div>

            {/* 漢堡包按鈕 - 在小螢幕下顯示，大螢幕下隱藏 */}
            <div className="md:hidden flex items-center">
              <button
                className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={() => setShowMobileMenu(!showMobileMenu)} // 使用新的狀態控制手機版導航顯示
              >
                <Menu className="w-6 h-6 text-gray-700" /> {/* 漢堡包圖示 */}
              </button>
            </div>

          </div>

          {/* 手機版導航選單 - 預設隱藏，點擊漢堡包按鈕時顯示 */}
          <div className={`${showMobileMenu ? 'block' : 'hidden'} md:hidden`}> {/* 使用新的狀態控制顯示 */}
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {/* 手機版菜單項目 - 您可以根據需求調整內容和樣式 */}
                {/* 例如：將桌面版的導航項目複製過來，或者創建一個精簡版 */}
                <button className="w-full text-left relative p-2 rounded-md hover:bg-gray-100" onClick={() => {
                   setShowAlertPopup(true); // 點擊通知按鈕時仍然顯示疫苗提醒
                   setShowMobileMenu(false); // 點擊後關閉手機版導航
                }}>
                  <Bell className="w-6 h-6 text-gray-700 inline-block mr-2" />
                  通知
                  {vaccineAlerts.length > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                      !
                    </span>
                  )}
                </button>
                 <button
                  className="w-full text-left p-2 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700"
                  onClick={() => {
                    if (user) {
                              subscribeUserToPush(user.id);
                              setShowMobileMenu(false); // 點擊後關閉手機版導航
                        }
                    
                  }}
                  title="訂閱推播通知"
                >
                  <Bell className="w-5 h-5 inline-block mr-1" />
                  訂閱通知
                </button>
                <div className="block px-3 py-2 text-base font-medium text-gray-700">
                    {user?.email}
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setShowMobileMenu(false); // 點擊後關閉手機版導航
                  }}
                  className="w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  登出
                </button>
            </div>
          </div>


        </div>

        {/* 疫苗提醒彈出視窗 - 位置可能需要調整，以確保在手機版導航下方顯示 */}
        {showAlertPopup && (
          <div className="absolute right-4 top-16 z-50 bg-white border rounded shadow-lg p-4 w-80">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-800">疫苗提醒</span>
              <button onClick={() => setShowAlertPopup(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            {vaccineAlerts.length === 0 ? (
              <div className="text-gray-500">目前沒有即將到期的疫苗</div>
            ) : (
              <ul className="space-y-2">
                {vaccineAlerts.map(alert => {
                  const dueDate = alert.next_due_date ? new Date(alert.next_due_date) : null;

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  if (dueDate) {
                    dueDate.setHours(0, 0, 0, 0);
                  }

                  const days = dueDate ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <li key={alert.id} className="flex flex-col text-sm">
                      <span className="font-medium text-gray-700">
                        {alert.pets?.name ? `${alert.pets.name}：` : ''}{alert.vaccine_name}
                      </span>
                      <span>下次接種日：{alert.next_due_date}</span>
                      <span className={'text-yellow-600'}>
                        {days === 0 ? '今天到期' : `還剩 ${days} 天`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 功能選單 */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                to={item.link}
                className="block group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`${item.color} p-4 text-white`}>
                    {item.icon}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-500 transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
