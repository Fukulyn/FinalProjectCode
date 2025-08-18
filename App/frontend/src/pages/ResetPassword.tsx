import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);

  // 防止自動跳轉並監聽認證事件
  useEffect(() => {
    // 阻止其他組件的自動跳轉邏輯
    const preventRedirect = () => {
      window.history.replaceState(null, '', '/reset-password');
    };
    
    // 監聽路由變化
    window.addEventListener('popstate', preventRedirect);
    
    // 監聽 Supabase 認證事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('認證事件:', event, session);
      
      if (event === 'PASSWORD_RECOVERY' && session) {
        // 密碼重設會話建立成功
        console.log('密碼重設會話已建立');
        setValidSession(true);
        setError('');
      } else if (event === 'SIGNED_IN' && session) {
        // 用戶登入成功（在重設密碼流程中）
        console.log('重設密碼會話已建立');
        setValidSession(true);
        setError('');
      }
    });
    
    return () => {
      window.removeEventListener('popstate', preventRedirect);
      subscription?.unsubscribe();
    };
  }, []);

  // 檢查重設密碼令牌或錯誤狀態
  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        // 首先檢查是否有錯誤參數
        const errorType = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorType) {
          if (errorType === 'access_denied' || errorDescription?.includes('expired')) {
            setError('重設密碼連結已過期或無效。重設密碼連結的有效期為24小時，請重新申請。');
          } else {
            setError(`重設密碼時發生錯誤：${decodeURIComponent(errorDescription || errorType)}`);
          }
          setValidSession(false);
          return;
        }

        // 檢查 URL 中的令牌
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          // 使用 URL 中的令牌設置會話
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('設置會話失敗:', error);
            setError('重設密碼連結已過期或無效，請重新申請。');
            setValidSession(false);
          } else {
            setValidSession(true);
          }
          return;
        }

        // 如果沒有 URL 參數，檢查當前會話狀態
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('檢查會話時發生錯誤:', sessionError);
          setError('檢查重設密碼狀態時發生錯誤，請重新申請。');
          setValidSession(false);
          return;
        }

        if (session && session.user) {
          // 有有效會話，檢查是否是重設密碼會話
          console.log('找到有效會話:', session);
          setValidSession(true);
        } else {
          // 沒有會話，可能是直接訪問頁面或連結有問題
          console.log('沒有找到有效會話，可能需要重新點擊連結');
          setError('未偵測到有效的重設密碼會話。如果您剛從郵件點擊連結，請稍等 3-5 秒讓頁面完全載入，或嘗試重新點擊郵件中的連結。');
          setValidSession(false);
        }
      } catch (err) {
        console.error('處理重設密碼時發生錯誤:', err);
        setError('處理重設密碼連結時發生錯誤，請重新申請。');
        setValidSession(false);
      }
    };

    // 延遲執行以確保頁面完全載入
    const timer = setTimeout(handlePasswordReset, 100);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 驗證密碼
    if (password.length < 6) {
      setError('密碼長度至少需要 6 個字元');
      return;
    }

    if (password !== confirmPassword) {
      setError('密碼確認不一致');
      return;
    }

    setLoading(true);

    try {
      // 直接使用 Supabase 更新密碼
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess('🎉 密碼重設成功！正在登出並跳轉到登入頁面，請使用新密碼登入。');
      
      // 登出並清除會話
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '密碼重設失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          設定新密碼
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {error ? '重設密碼時發生問題' : '請輸入您的新密碼'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && !validSession ? (
            // 顯示錯誤狀態
            <div className="text-center">
              <div className="text-red-600 text-sm bg-red-50 p-4 rounded-md border border-red-200 mb-6">
                <div className="font-medium mb-2">❌ 重設密碼失敗</div>
                <div>{error}</div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-6">
                <div className="text-blue-800 text-sm">
                  <div className="font-medium mb-2">💡 如何重新申請重設密碼：</div>
                  <div className="text-left space-y-1">
                    <div>1. 點擊下方按鈕返回登入頁面</div>
                    <div>2. 點擊「忘記密碼？」</div>
                    <div>3. 輸入您的電子郵件地址</div>
                    <div>4. 檢查郵箱中的新重設連結</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  🔄 重新載入頁面
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  🔐 返回登入頁面重新申請
                </button>
              </div>
            </div>
          ) : (
            // 顯示密碼重設表單
            <>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    新密碼
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="請輸入新密碼（至少6個字元）"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    確認新密碼
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="請再次輸入新密碼"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-green-500 text-sm bg-green-50 p-3 rounded-md border border-green-200">
                    {success}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '設定中...' : '設定新密碼'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
                >
                  返回登入頁面
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
