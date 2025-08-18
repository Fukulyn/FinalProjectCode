"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, RotateCcw } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        // 1) 若 hash 上有 access_token/refresh_token（常見的 recovery 連結），先以此建立 session
        if (typeof window !== 'undefined' && window.location.hash) {
          const h = window.location.hash;
          if (/access_token=|refresh_token=|type=recovery/.test(h)) {
            const params = new URLSearchParams(h.replace(/^#/, ''));
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              const { error } = await supabase.auth.setSession({ access_token, refresh_token });
              if (error) throw error;
            }
            // 清除 hash 以避免其他頁面再次誤判
            const clean = window.location.pathname + window.location.search;
            window.history.replaceState(null, '', clean);
          }
        }
        // 2) 若有 code 參數（另一種流程），用 code 交換 session
        const code = searchParams?.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setStatus(data.session ? 'ready' : 'error');
          if (!data.session) setErrorMsg('連結無效或已過期，請重新發送重設郵件。');
        }
      } catch (err: any) {
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
            <CardTitle className="flex items-center gap-2 text-2xl"><RotateCcw className="w-5 h-5"/> 需要重新發送</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.replace('/welcome')}>回到登入</Button>
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
