
"use client";

import { SwipeInterface } from '@/components/dog/SwipeInterface';
import { usePawsConnect } from '@/context/PawsConnectContext';
import { PawPrint } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, isLoadingAuth } = usePawsConnect();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      router.replace('/welcome');
    }
  }, [user, isLoadingAuth, router]);

  if (isLoadingAuth || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <PawPrint className="w-12 h-12 text-primary animate-spin" />
        <p className="mt-4 text-lg text-muted-foreground">正在驗證您的身份...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-2 text-center">
        尋找您的下一個摯友
      </h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        向右滑動表示喜歡，向左滑動表示略過。點擊狗狗的照片查看更多詳細資料。您的毛茸茸夥伴正等著您！
      </p>
      <SwipeInterface />
    </div>
  );
}
