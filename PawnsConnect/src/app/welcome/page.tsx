
"use client";

import { AuthForm } from '@/components/auth/AuthForm';
import { PawPrint, Heart, Search } from 'lucide-react';
import Image from 'next/image';
import { usePawsConnect } from '@/context/PawsConnectContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WelcomePage() {
    const { user, isLoadingAuth } = usePawsConnect();
    const router = useRouter();

    useEffect(() => {
        if (!isLoadingAuth && user) {
            router.replace('/');
        }
    }, [user, isLoadingAuth, router]);

    if (isLoadingAuth || user) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <PawPrint className="w-12 h-12 text-primary animate-spin" />
          <p className="mt-4 text-lg text-muted-foreground">正在載入中...</p>
        </div>
      );
    }

    return (
        <div className="w-full space-y-12">
            <section className="text-center pt-8 md:pt-16">
                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-center items-center gap-4 mb-4">
                        <PawPrint className="w-12 h-12 text-primary" />
                        <h1 className="text-4xl md:text-6xl font-headline font-bold text-primary">
                            PawsConnect
                        </h1>
                    </div>
                    <p className="text-xl md:text-2xl font-semibold text-foreground mb-4">
                        找到您下一個毛茸茸的摯友。
                    </p>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        PawsConnect 是一個創新的平台，旨在為流浪狗狗和充滿愛心的家庭之間建立起一座橋樑。我們相信每一隻狗狗都值得一個溫暖的家。
                    </p>
                </div>
            </section>
            
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="space-y-8 order-2 md:order-1">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-headline font-bold">它是如何運作的？</h2>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                                <Search className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold">探索</h3>
                                <p className="text-muted-foreground">瀏覽來自各個收容所的可愛狗狗的資料。向右滑動表示喜歡，向左滑動表示跳過。</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                               <Heart className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold">配對</h3>
                                <p className="text-muted-foreground">當您對某隻狗狗表達興趣後，您可以在「我的配對」中查看牠們的詳細資料並與收容所聯繫。</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-full">
                                <PawPrint className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold">領養</h3>
                                <p className="text-muted-foreground">與收容所安排見面，完成領養程序，迎接您的新家庭成員！</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-xl">
                        <Image src="https://placehold.co/600x400.png" alt="Happy dog with owner" layout="fill" objectFit="cover" data-ai-hint="dog person" />
                    </div>
                </div>

                <div className="w-full order-1 md:order-2">
                    <AuthForm />
                </div>
            </div>
        </div>
    );
}
