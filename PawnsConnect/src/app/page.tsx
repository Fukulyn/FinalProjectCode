"use client";

import { SwipeInterface } from '@/components/dog/SwipeInterface';
import { BreedFilterComponent } from '@/components/filters/BreedFilter';
import { usePawsConnect } from '@/context/PawsConnectContext';
import { PawPrint } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, isLoadingAuth, breedFilter, setBreedFilter } = usePawsConnect();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 可能出現在 query 或 hash 的重設線索（在 CSR 後判斷，避免 SSR/CSR 文字不一致）
  const [shouldReset, setShouldReset] = useState(false);
  const code = searchParams?.get('code');
  useEffect(() => {
    const typeParam = searchParams?.get('type');
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const isRecoveryHash = /(?:^|[&#])type=recovery(?:&|$)/.test(hash) || /access_token=/.test(hash);
    const next = !!code || typeParam === 'recovery' || isRecoveryHash;
    setShouldReset(next);
  }, [searchParams, code]);

  // 若郵件把 redirect_to 指到根目錄，攔截 code 參數並導向 /reset-password
  useEffect(() => {
    if (shouldReset) {
      const next = code ? `/reset-password?code=${encodeURIComponent(code)}` : '/reset-password';
      router.replace(next);
    }
  }, [shouldReset, code, router]);

  useEffect(() => {
    if (!isLoadingAuth && !user && !shouldReset) {
      router.replace('/welcome');
    }
  }, [user, isLoadingAuth, router, shouldReset]);

  if (isLoadingAuth || !user || shouldReset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <PawPrint className="w-12 h-12 text-primary animate-spin" />
  <p className="mt-4 text-lg text-muted-foreground">正在載入中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary mb-2 text-center">
        尋找您的下一個摯友
      </h1>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        向右滑動表示喜歡，向左滑動表示略過。點擊動物的照片查看更多詳細資料。您的毛茸茸夥伴正等著您！
      </p>
      
      {/* 品種篩選按鈕 */}
      <div className="mb-6">
        <BreedFilterComponent 
          currentFilter={breedFilter} 
          onFilterChange={setBreedFilter} 
        />
      </div>
      
      <SwipeInterface />
    </div>
  );
}
