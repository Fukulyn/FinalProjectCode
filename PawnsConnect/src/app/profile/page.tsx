
"use client";

import { usePawsConnect } from '@/context/PawsConnectContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Settings, UserCircle2, PawPrint, Edit3, Save, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

const profileUpdateSchema = z.object({
  fullName: z.string()
    .max(100, "全名長度不可超過 100 個字元。")
    .transform(val => val.trim() === '' ? null : val.trim())
    .nullable(),
  avatarUrl: z.string()
    .url({ message: "請輸入有效的頭像 URL。" })
    .max(2048, "頭像 URL 過長。")
    .or(z.literal('')) 
    .transform(val => val.trim() === '' ? null : val.trim())
    .nullable(),
});

type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

export default function ProfilePage() {
  const { 
    user: authUser, 
    profile, 
    isLoadingAuth, 
    getLikedDogsCount,
    updateProfile,
    isUpdatingProfile
  } = usePawsConnect();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [likedDogsCount, setLikedDogsCount] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsLoaded, setStatsLoaded] = useState(false); // 防止重複載入

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: '',
      avatarUrl: '',
    }
  });
  
  const handleEditToggle = (editing: boolean) => {
    setIsEditing(editing);
    if (editing && profile) {
      reset({
        fullName: profile.fullName || '',
        avatarUrl: profile.avatarUrl || '',
      });
    }
  };

  useEffect(() => {
    if (!isLoadingAuth && !authUser) {
      console.log('🚪 [ProfilePage] 用戶未登入，重導向到首頁');
      router.replace('/');
    }
  }, [authUser, isLoadingAuth, router]);

  useEffect(() => {
    if (profile && !isEditing) {
      console.log('📝 [ProfilePage] 重設表單資料:', {
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl
      });
      
      reset({
        fullName: profile.fullName || '',
        avatarUrl: profile.avatarUrl || '',
      });
    }
  }, [profile, reset, isEditing]);

  // Load liked dogs count for stats display
  useEffect(() => {
    console.log('🏠 [ProfilePage] useEffect 觸發 - 載入統計資料', { 
      hasUser: !!authUser, 
      userId: authUser?.id, 
      statsLoaded 
    });
    
    // 如果已經載入過統計資料，且用戶沒有變化，則跳過
    if (statsLoaded && authUser) {
      console.log('📊 [ProfilePage] 統計資料已載入，跳過重複載入');
      return;
    }
    
    let isCancelled = false; // 防止組件卸載後設置狀態
    
    const loadStats = async () => {
      if (authUser && !isCancelled) {
        console.log(`👤 [ProfilePage] 用戶已登入，開始載入統計: ${authUser.id}`);
        setIsLoadingStats(true);
        
        try {
          console.log('🔍 [ProfilePage] 呼叫 getLikedDogsCount');
          const count = await getLikedDogsCount();
          
          if (!isCancelled) {
            console.log(`✅ [ProfilePage] 成功獲取喜歡的狗狗數量: ${count}`);
            setLikedDogsCount(count);
            setStatsLoaded(true);
          }
        } catch (error) {
          if (!isCancelled) {
            console.error('❌ [ProfilePage] 載入喜歡狗狗數量時發生錯誤:', error);
          }
        } finally {
          if (!isCancelled) {
            setIsLoadingStats(false);
            console.log('🏁 [ProfilePage] 統計資料載入完成');
          }
        }
      } else if (!authUser) {
        console.log('❌ [ProfilePage] 用戶未登入，跳過統計載入');
        setIsLoadingStats(false);
        setStatsLoaded(false);
      }
    };
    
    loadStats();
    
    return () => {
      isCancelled = true; // 清理函數
    };
  }, [authUser?.id, getLikedDogsCount, statsLoaded]);

  // 簡化頁面狀態日誌，只在關鍵狀態變化時記錄
  useEffect(() => {
    if (isLoadingAuth !== undefined && authUser !== undefined) {
      console.log('📊 [ProfilePage] 關鍵狀態更新:', {
        isLoadingAuth,
        hasUser: !!authUser,
        hasProfile: !!profile,
        isLoadingStats,
        statsLoaded,
        likedDogsCount
      });
    }
  }, [isLoadingAuth, !!authUser, !!profile, isLoadingStats, statsLoaded, likedDogsCount]);

  // 使用 useMemo 優化昂貴的計算
  const formattedJoinDate = useMemo(() => {
    if (authUser?.created_at) {
      return new Date(authUser.created_at).toLocaleDateString('zh-TW');
    } else if (profile?.updatedAt) { 
      return new Date(profile.updatedAt).toLocaleDateString('zh-TW');
    }
    return null;
  }, [authUser?.created_at, profile?.updatedAt]);

  const getInitials = useMemo(() => {
    return (name?: string | null) => {
      if (!name) return '';
      // Handle CJK names (e.g., "王小明" -> "小明")
      const cjkRegex = /[\u4e00-\u9fa5]/;
      if (cjkRegex.test(name)) {
          return name.length > 2 ? name.substring(name.length - 2) : name;
      }
      // Handle Western names (e.g., "John Doe" -> "JD")
      const nameParts = name.split(' ').filter(part => part.length > 0);
      if (nameParts.length > 1) {
          return nameParts.map(n => n[0]).join('').toUpperCase();
      }
      // Fallback for single word names (e.g., "Admin" -> "AD")
      return name.substring(0, 2).toUpperCase();
    }
  }, []);
  
  const currentAvatarPreview = watch('avatarUrl');
  const avatarSrc = isEditing ? (currentAvatarPreview || undefined) : (profile?.avatarUrl || undefined);
  const nameDisplay = isEditing ? (watch('fullName') || 'PawsConnect 使用者') : (profile?.fullName || 'PawsConnect 使用者');

  const onSubmit: SubmitHandler<ProfileUpdateFormValues> = async (data) => {
    const result = await updateProfile({
      fullName: data.fullName,
      avatarUrl: data.avatarUrl,
    });

    if (result.success) {
      toast({ title: '個人資料已更新', description: '您的變更已儲存。' });
      handleEditToggle(false);
    } else {
      toast({
        title: '更新失敗',
        description: result.error || '更新個人資料時發生錯誤。請檢查您的權限或稍後再試。',
        variant: 'destructive',
      });
    }
  };
  
  if (isLoadingAuth) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">我的個人資料</h1>
        </header>

        <Card className="shadow-xl">
          <CardHeader className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-primary/10 to-background rounded-t-lg">
            {/* 骨架頭像 */}
            <div className="w-24 h-24 mb-4 border-4 border-primary/50 rounded-full bg-muted animate-pulse" />
            {/* 骨架名稱 */}
            <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
            {/* 骨架郵件 */}
            <div className="h-4 w-48 bg-muted animate-pulse rounded mb-1" />
            {/* 骨架日期 */}
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="p-6">
            {/* 骨架統計 */}
            <div className="flex justify-around items-center text-center space-x-4 mb-6">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
              </div>
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
              </div>
            </div>
            {/* 骨架按鈕 */}
            <div className="space-y-3">
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果用戶已載入但沒有 profile，等待 profile 創建完成
  if (authUser && !profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">我的個人資料</h1>
        </header>

        <Card className="shadow-xl">
          <CardContent className="p-6 text-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-muted-foreground">正在初始化個人資料...</p>
              <p className="text-sm text-muted-foreground">首次登入需要建立您的個人檔案</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">我的個人資料</h1>
      </header>

      <Card className="shadow-xl">
        <CardHeader className="flex flex-col items-center text-center p-6 bg-gradient-to-br from-primary/10 to-background rounded-t-lg">
          <Avatar className="w-24 h-24 mb-4 border-4 border-primary/50">
            <AvatarImage src={avatarSrc} alt={nameDisplay} key={avatarSrc} data-ai-hint="person avatar" />
            <AvatarFallback className="text-3xl bg-primary/20 text-primary">
                {getInitials(nameDisplay) || <UserCircle2 size={40}/>}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl font-headline">{nameDisplay}</CardTitle>
          <CardDescription className="text-muted-foreground">{authUser?.email}</CardDescription>
          <p className="text-xs text-muted-foreground mt-1">
            加入日期: {formattedJoinDate || '載入日期中...'}
          </p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">全名</Label>
                <Input 
                  id="fullName" 
                  {...register('fullName')} 
                  placeholder="您的姓名"
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <Label htmlFor="avatarUrl">頭像 URL</Label>
                <Input 
                  id="avatarUrl" 
                  {...register('avatarUrl')} 
                  placeholder="https://example.com/avatar.png"
                  className={errors.avatarUrl ? "border-destructive" : ""}
                />
                {errors.avatarUrl && <p className="text-xs text-destructive mt-1">{errors.avatarUrl.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={isUpdatingProfile}>
                  <Save className="mr-2 h-4 w-4" /> {isUpdatingProfile ? '儲存中...' : '儲存變更'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => handleEditToggle(false)} disabled={isUpdatingProfile}>
                  <XCircle className="mr-2 h-4 w-4" /> 取消
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex justify-around text-center border-b pb-6">
                <div className="space-y-1">
                  {isLoadingStats ? (
                    <div className="h-8 w-12 bg-muted animate-pulse rounded mx-auto"></div>
                  ) : (
                    <p className="text-2xl font-bold text-primary">{likedDogsCount}</p>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Heart className="h-4 w-4" /> 喜歡的狗狗</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><PawPrint className="h-4 w-4" /> 待領養</p>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => handleEditToggle(true)}>
                  <Edit3 className="mr-2 h-4 w-4 text-primary" /> 編輯個人資料
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/matches">
                    <Heart className="mr-2 h-4 w-4 text-primary" /> 查看我的配對
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/profile/settings">
                    <Settings className="mr-2 h-4 w-4 text-primary" /> 帳戶設定
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>感謝您使用 PawsConnect 尋找您的毛茸茸夥伴！</p>
      </div>
    </div>
  );
}

    