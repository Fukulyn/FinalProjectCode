import React, { useState, useEffect } from 'react';
import { Bell, Settings, Calendar, Mail, Smartphone, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { subscribeUserToPush } from '../lib/firebase';

interface ReminderSettings {
  id?: string;
  user_id: string;
  vaccine_reminder_days: number;
  email_enabled: boolean;
  push_enabled: boolean;
  reminder_time: string;
  created_at?: string;
  updated_at?: string;
}

export default function VaccineReminderSettings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<ReminderSettings>({
    user_id: user?.id || '',
    vaccine_reminder_days: 7,
    email_enabled: true,
    push_enabled: true,
    reminder_time: '09:00'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_reminder_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // 如果沒有設定記錄，使用預設值
        setSettings(prev => ({ ...prev, user_id: user?.id || '' }));
      }
    } catch (error) {
      console.error('載入提醒設定失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const settingsData = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      if (settings.id) {
        // 更新現有設定
        const { error } = await supabase
          .from('vaccine_reminder_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // 創建新設定
        const { data, error } = await supabase
          .from('vaccine_reminder_settings')
          .insert([{
            ...settingsData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        setSettings(data);
      }

      // 如果啟用推播通知，註冊推播訂閱
      if (settings.push_enabled && user) {
        try {
          await subscribeUserToPush(user.id);
        } catch (error) {
          console.error('註冊推播通知失敗:', error);
        }
      }

      setMessage('設定已儲存');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('儲存設定失敗:', error);
      setMessage('儲存失敗，請重試');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ReminderSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 標題列 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="返回上一頁"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">疫苗提醒設定</h1>
            </div>
          </div>
          <p className="text-gray-600">
            設定疫苗到期提醒，讓您不會錯過重要的疫苗接種時間
          </p>
        </div>

        {/* 提醒時間設定 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">提醒時間設定</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                提前幾天提醒
              </label>
              <select
                value={settings.vaccine_reminder_days}
                onChange={(e) => handleInputChange('vaccine_reminder_days', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="提前幾天提醒"
              >
                <option value={1}>1天前</option>
                <option value={3}>3天前</option>
                <option value={7}>7天前</option>
                <option value={14}>14天前</option>
                <option value={30}>30天前</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每日提醒時間
              </label>
              <input
                type="time"
                value={settings.reminder_time}
                onChange={(e) => handleInputChange('reminder_time', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="每日提醒時間"
              />
            </div>
          </div>
        </div>

        {/* 通知方式設定 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">通知方式</h2>
          </div>

          <div className="space-y-4">
            {/* 郵件通知 */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="font-medium text-gray-900">郵件通知</h3>
                  <p className="text-sm text-gray-500">透過電子郵件接收疫苗提醒</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_enabled}
                  onChange={(e) => handleInputChange('email_enabled', e.target.checked)}
                  className="sr-only peer"
                  aria-label="啟用郵件通知"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 推播通知 */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="font-medium text-gray-900">推播通知</h3>
                  <p className="text-sm text-gray-500">在裝置上接收即時推播提醒</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.push_enabled}
                  onChange={(e) => handleInputChange('push_enabled', e.target.checked)}
                  className="sr-only peer"
                  aria-label="啟用推播通知"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* 儲存按鈕 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                儲存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                儲存設定
              </>
            )}
          </button>

          {message && (
            <div className={`mt-3 p-3 rounded-lg text-center ${
              message.includes('失敗') 
                ? 'bg-red-50 text-red-600' 
                : 'bg-green-50 text-green-600'
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
