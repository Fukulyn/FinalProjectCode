import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { Heart, Utensils, Syringe, Camera, Wifi, Bell, Trash2 } from 'lucide-react';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';
import { Reminder } from '../types';

export default function Dashboard() {
  const { signOut, user } = useAuthStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*, pets(name)')
        .eq('user_id', user?.id)
        .eq('active', true)
        .order('scheduled_time');

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: '寵物檔案',
      icon: <Logo size="sm" showText={false} />,
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
    {
      title: '即時監控',
      icon: <Camera className="w-6 h-6" />,
      description: '寵物攝影機即時畫面',
      link: '/monitor',
      color: 'bg-indigo-500',
    },
    {
      title: '設備管理',
      icon: <Wifi className="w-6 h-6" />,
      description: '智能設備配對與控制',
      link: '/devices',
      color: 'bg-yellow-500',
    },
    {
      title: '提醒管理',
      icon: <Bell className="w-6 h-6" />,
      description: '管理所有提醒事項',
      link: '/reminders',
      color: 'bg-pink-500',
    },
  ];

  const getReminderIcon = (type: Reminder['type']) => {
    switch (type) {
      case 'feeding':
        return <Utensils className="w-5 h-5" />;
      case 'medicine':
        return <Heart className="w-5 h-5" />;
      case 'cleaning':
        return <Trash2 className="w-5 h-5" />;
      case 'vaccine':
        return <Syringe className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeText = (type: Reminder['type']) => {
    switch (type) {
      case 'feeding':
        return '餵食';
      case 'medicine':
        return '餵藥';
      case 'cleaning':
        return '清理';
      case 'vaccine':
        return '疫苗';
      default:
        return '提醒';
    }
  };

  const getRepeatDaysText = (days: number[]) => {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    if (days.length === 7) return '每天';
    if (days.length === 0) return '無重複';
    return days.map(d => `週${weekdays[d]}`).join('、');
  };

  const handleComplete = async (reminderId: string) => {
    try {
      const { error } = await supabase.from('reminder_logs').insert([
        {
          reminder_id: reminderId,
          status: 'completed',
        },
      ]);

      if (error) throw error;
      fetchReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo size="md" />
            </div>
            <div className="flex items-center">
              <span className="mr-4 text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 提醒區塊 */}
        {reminders.length > 0 && (
          <div className="px-4 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">今日提醒</h2>
              <Link
                to="/reminders"
                className="text-sm text-blue-500 hover:text-blue-600"
              >
                查看全部
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="divide-y divide-gray-200">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        reminder.type === 'feeding' ? 'bg-green-100 text-green-600' :
                        reminder.type === 'medicine' ? 'bg-red-100 text-red-600' :
                        reminder.type === 'cleaning' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {getReminderIcon(reminder.type)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {reminder.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getTypeText(reminder.type)} · {reminder.scheduled_time.slice(0, 5)} · {getRepeatDaysText(reminder.repeat_days)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleComplete(reminder.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        完成
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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