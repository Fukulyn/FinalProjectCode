"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { PawPrint } from 'lucide-react';

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <PawPrint className="w-12 h-12 text-primary animate-spin" />
      <p className="mt-4 text-lg text-muted-foreground">正在重新導向至登入頁面...</p>
    </div>
  );
}
