"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, RotateCcw, Mail } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      console.log('🔐 [ResetPassword] 開始驗證重設密碼連結');
      
      try {
        // 檢查 URL 中是否有錯誤參數
        const error = searchParams?.get('error');
        const errorCode = searchParams?.get('error_code');
        const errorDescription = searchParams?.get('error_description');
        
        if (error) {
          console.log('❌ [ResetPassword] URL 中發現錯誤:', { error, errorCode, errorDescription });
          
          let userFriendlyMessage = '重設密碼連結無效';
          
          if (errorCode === 'otp_expired' || error === 'access_denied') {
            userFriendlyMessage = '重設密碼連結已過期，請重新發送。';
          } else if (errorDescription) {
            userFriendlyMessage = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
          }
          
          if (!cancelled) {
            setStatus('error');
            setErrorMsg(userFriendlyMessage);
          }
          return;
        }

        // 1) 若 hash 上有 access_token/refresh_token（常見的 recovery 連結），先以此建立 session
        if (typeof window !== 'undefined' && window.location.hash) {
          const h = window.location.hash;
          console.log('🔍 [ResetPassword] 檢查 hash:', h);
          
          if (/access_token=|refresh_token=|type=recovery/.test(h)) {
            console.log('📧 [ResetPassword] 發現 recovery 連結參數');
            const params = new URLSearchParams(h.replace(/^#/, ''));
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            
            if (access_token && refresh_token) {
              console.log('🔑 [ResetPassword] 嘗試建立 session');
              const { error } = await supabase.auth.setSession({ access_token, refresh_token });
              if (error) {
                console.error('❌ [ResetPassword] Session 建立失敗:', error);
                throw error;
              }
              console.log('✅ [ResetPassword] Session 建立成功');
            }
            // 清除 hash 以避免其他頁面再次誤判
            const clean = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', clean);
          }
        }
        
        // 2) 若有 code 參數（另一種流程），用 code 交換 session
        const code = searchParams?.get('code');
        if (code) {
          console.log('🔐 [ResetPassword] 發現 code 參數，嘗試交換 session');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('❌ [ResetPassword] Code 交換失敗:', error);
            throw error;
          }
          console.log('✅ [ResetPassword] Code 交換成功');
        }
        
        const { data } = await supabase.auth.getSession();
        console.log('📊 [ResetPassword] 檢查最終 session 狀態:', !!data.session);
        
        if (!cancelled) {
          setStatus(data.session ? 'ready' : 'error');
          if (!data.session) {
            setErrorMsg('連結無效或已過期，請重新發送重設郵件。');
          } else {
            console.log('🎉 [ResetPassword] 重設密碼準備就緒');
          }
        }
      } catch (err: any) {
        console.error('💥 [ResetPassword] 驗證過程發生錯誤:', err);
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(err?.message || '驗證連結時發生錯誤，請重新發送重設郵件。');
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, [searchParams]);

  const onSubmit = async () => {
    if (password.length < 6) {
      toast({ title: '密碼太短', description: '請至少輸入 6 個字元。', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: '兩次密碼不一致', description: '請再次確認。', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // 再次確認有有效 session（有時瀏覽器阻擋或逾時會讓 session 消失）
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        throw new Error('目前沒有有效登入狀態，請重新從郵件連結進入或再寄一次重設信。');
      }

      // 加入逾時保護，避免網路異常時卡在 loading
      const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('連線逾時，請稍後再試。')), 20000));
      const update = supabase.auth.updateUser({ password });
      const { error } = await Promise.race([update, timeout]);
      if (error) throw error as Error;

      toast({ title: '密碼已更新', description: '請使用新密碼登入。' });
      // 使用硬導轉以確保清除任何殘留的 hash 片段，避免被歡迎頁/首頁的攔截再次導回本頁
      if (typeof window !== 'undefined') {
        window.location.replace('/welcome');
      } else {
        router.replace('/welcome');
      }
    } catch (err: any) {
      console.error('reset-password/updateUser error:', err);
      toast({ title: '更新失敗', description: err?.message || '發生未知錯誤', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resendResetEmail = async () => {
    if (!email.trim()) {
      toast({ 
        title: '請輸入郵件地址', 
        description: '請輸入您的註冊郵件地址以重新發送重設連結。', 
        variant: 'destructive' 
      });
      return;
    }

    setSendingEmail(true);
    try {
      console.log('📧 [ResetPassword] 重新發送重設郵件:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://7jjl14w0-3000.asse.devtunnels.ms/reset-password`
      });
      
      if (error) {
        console.error('❌ [ResetPassword] 發送重設郵件失敗:', error);
        throw error;
      }
      
      console.log('✅ [ResetPassword] 重設郵件發送成功');
      toast({
        title: '重設郵件已發送',
        description: '請檢查您的郵箱並點擊新的重設密碼連結。',
      });
      
      setEmail(''); // 清空輸入框
    } catch (err: any) {
      console.error('💥 [ResetPassword] 重新發送失敗:', err);
      toast({
        title: '發送失敗',
        description: err?.message || '無法發送重設郵件，請稍後再試。',
        variant: 'destructive'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  if (status === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="mt-4 text-lg text-muted-foreground">正在驗證連結...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-md mx-auto w-full">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <RotateCcw className="w-5 h-5"/> 連結已過期
            </CardTitle>
            <CardDescription className="text-red-600">
              {errorMsg}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 mb-3">
                💡 <strong>解決方案：</strong>重新發送重設密碼郵件
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="resend-email">請輸入您的郵件地址</Label>
                  <Input
                    id="resend-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1"
                  />
                </div>
                <Button 
                  onClick={resendResetEmail} 
                  disabled={sendingEmail}
                  className="w-full"
                  variant="outline"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      發送中...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4"/>
                      重新發送重設郵件
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => router.replace('/welcome')}
              variant="secondary"
            >
              回到登入頁面
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto w-full">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl"><Lock className="w-5 h-5"/> 重設密碼</CardTitle>
          <CardDescription>請輸入新密碼並確認。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="password">新密碼</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <Label htmlFor="confirm">確認新密碼</Label>
            <Input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="button" className="w-full" onClick={onSubmit} disabled={loading || status !== 'ready'}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> 更新中...</> : '更新密碼'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
