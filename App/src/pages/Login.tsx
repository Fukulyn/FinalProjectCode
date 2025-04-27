import React, { useState, useEffect } from 'react';
import { Home, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { requestNotificationPermission } from '../lib/notifications';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, signUp, resetPassword } = useAuthStore();

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await resetPassword(email);
      setSuccess('重設密碼連結已寄出，請檢查您的信箱');
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {!showForgotPassword ? (
            <>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    電子郵件
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    密碼
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {isLogin ? '登入' : '註冊'}
                  </button>
                </div>
              </form>

              <div className="mt-6 flex flex-col space-y-4">
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-center text-sm text-gray-600 hover:text-gray-900"
                >
                  {isLogin ? '還沒有帳號？註冊' : '已有帳號？登入'}
                </button>
                {isLogin && (
                  <button
                    onClick={() => setShowForgotPassword(true)}
                    className="text-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    忘記密碼？
                  </button>
                )}
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">重設密碼</h2>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="關閉重設密碼窗口"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                    電子郵件
                  </label>
                  <div className="mt-1">
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm">{error}</div>
                )}

                {success && (
                  <div className="text-green-500 text-sm">{success}</div>
                )}

                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  發送重設密碼連結
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}