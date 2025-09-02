"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { UserRole } from '@/types';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('處理認證回調，URL 參數:', Object.fromEntries(searchParams.entries()));
        
        // 獲取所有可能的參數
        const token_hash = searchParams.get('token_hash');
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        const code = searchParams.get('code');

        let user = null;

        // 方法 1: 使用 code (PKCE flow)
        if (code) {
          console.log('使用 code 進行認證');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange 錯誤:', error);
            setStatus('error');
            setMessage('驗證過程中發生錯誤：' + error.message);
            return;
          }

          user = data.user;
        }
        // 方法 2: 使用 access_token 和 refresh_token
        else if (access_token && refresh_token) {
          console.log('使用 access_token 和 refresh_token');
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });

          if (error) {
            console.error('Set session 錯誤:', error);
            setStatus('error');
            setMessage('驗證過程中發生錯誤：' + error.message);
            return;
          }

          user = data.user;
        }
        // 方法 3: 使用 token_hash (OTP)
        else if (token_hash && type) {
          console.log('使用 token_hash 進行 OTP 驗證');
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any
          });

          if (error) {
            console.error('OTP 驗證錯誤:', error);
            setStatus('error');
            setMessage('電子郵件驗證失敗：' + error.message);
            return;
          }

          user = data.user;
        }
        else {
          // 如果沒有找到有效的參數
          console.log('未找到有效的認證參數');
          setStatus('error');
          setMessage('無效的驗證連結或缺少必要參數。');
          return;
        }

        if (user) {
          await handleSuccessfulVerification(user);
        } else {
          setStatus('error');
          setMessage('驗證失敗，未取得用戶資訊。');
        }

      } catch (error) {
        console.error('驗證過程中發生未預期錯誤:', error);
        setStatus('error');
        setMessage('驗證過程中發生未預期的錯誤。');
      }
    };

    const handleSuccessfulVerification = async (user: any) => {
      try {
        // 檢查是否已有個人資料
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // 如果沒有個人資料，從用戶元數據中創建
        if (!existingProfile && user.user_metadata) {
          const role = user.user_metadata.role as UserRole || 'adopter';
          const fullName = user.user_metadata.full_name || user.email?.split('@')[0] || 'User';
          
          const getAvatarText = () => {
            if (fullName) {
              const name = fullName.trim();
              const cjkRegex = /[\u4e00-\u9fa5]/;
              if (cjkRegex.test(name)) {
                return name.length > 2 ? name.substring(name.length - 2) : name;
              }
            }
            return user.email?.split('@')[0] || 'User';
          };

          const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            role,
            full_name: fullName,
            avatar_url: `https://placehold.co/100x100.png?text=${encodeURIComponent(getAvatarText())}`,
            updated_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error('建立個人資料時發生錯誤:', profileError);
            setStatus('error');
            setMessage('驗證成功，但建立個人資料時發生錯誤。請聯繫客服。');
            return;
          }
        }

        setStatus('success');
        setMessage('電子郵件驗證成功！歡迎加入 PawsConnect！');
        
        // 3秒後跳轉到主頁
        setTimeout(() => {
          router.push('/');
        }, 3000);

      } catch (error) {
        console.error('處理成功驗證時發生錯誤:', error);
        setStatus('error');
        setMessage('驗證成功，但處理用戶資料時發生錯誤。');
      }
    };

    handleAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
            電子郵件驗證
          </CardTitle>
          <CardDescription>
            {status === 'loading' && '正在驗證您的電子郵件...'}
            {status === 'success' && '驗證成功'}
            {status === 'error' && '驗證失敗'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          
          {status === 'success' && (
            <p className="text-xs text-muted-foreground">
              3秒後將自動跳轉到主頁...
            </p>
          )}
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/auth">返回登入頁面</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/welcome">返回首頁</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
