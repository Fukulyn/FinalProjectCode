
"use client";

import { usePawsConnect } from '@/context/PawsConnectContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Settings, UserCircle2, PawPrint, Edit3, Save, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from 'react';
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
    likedDogs, 
    updateProfile,
    isUpdatingProfile
  } = usePawsConnect();
  const router = useRouter();
  const { toast } = useToast();
  const [formattedJoinDate, setFormattedJoinDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
      router.replace('/');
    }
  }, [authUser, isLoadingAuth, router]);

  useEffect(() => {
    if (authUser?.created_at) {
      setFormattedJoinDate(new Date(authUser.created_at).toLocaleDateString('zh-TW'));
    } else if (profile?.updatedAt) { 
      setFormattedJoinDate(new Date(profile.updatedAt).toLocaleDateString('zh-TW'));
    }
  }, [authUser?.created_at, profile?.updatedAt]);

  useEffect(() => {
    if (profile && !isEditing) {
      reset({
        fullName: profile.fullName || '',
        avatarUrl: profile.avatarUrl || '',
      });
    }
  }, [profile, reset, isEditing]);

  const getInitials = (name?: string | null) => {
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
  
  const currentAvatarPreview = watch('avatarUrl');

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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <PawPrint className="w-12 h-12 text-primary animate-spin" />
        <p className="mt-4 text-lg text-muted-foreground">正在驗證您的身份...</p>
      </div>
    );
  }

  if (!authUser) {
    // This case should be handled by the useEffect redirect, but it's a good safeguard.
    return null;
  }
  
  if (!profile) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <PawPrint className="w-12 h-12 text-primary animate-spin" />
        <p className="mt-4 text-lg text-muted-foreground">載入個人資料...</p>
      </div>
    );
  }
  
  const avatarSrc = isEditing ? (currentAvatarPreview || undefined) : (profile?.avatarUrl || undefined);
  const nameDisplay = isEditing ? (watch('fullName') || 'PawsConnect 使用者') : (profile?.fullName || 'PawsConnect 使用者');


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
                  <p className="text-2xl font-bold text-primary">{likedDogs.length}</p>
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

    