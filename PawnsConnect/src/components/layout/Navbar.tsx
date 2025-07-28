
"use client";

import Link from 'next/link';
import { Dog, Heart, UserCircle, LogIn, LogOut, Sun, Moon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePawsConnect } from '@/context/PawsConnectContext';
import { useTheme } from '@/context/ThemeContext';

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoadingAuth } = usePawsConnect();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { href: '/', label: '滑卡配對', icon: <Dog className="h-5 w-5" />, requiresAuth: true },
    { href: '/matches', label: '我的配對', icon: <Heart className="h-5 w-5" />, requiresAuth: true },
    { href: '/adoption-info', label: '領養資訊', icon: <FileText className="h-5 w-5" />, requiresAuth: false },
  ];
  
  const isWelcomePage = pathname === '/welcome';

  const handleLogout = async () => {
    await logout();
    router.push('/welcome');
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href={user ? "/" : "/welcome"} className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <Dog className="h-8 w-8" />
          <h1 className="text-2xl font-headline font-bold">PawsConnect</h1>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          {!isWelcomePage && navItems.map((item) => {
            if (item.requiresAuth && !user) return null;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 h-auto sm:h-10",
                    pathname === item.href ? "text-primary font-semibold" : "text-foreground/70 hover:text-primary"
                  )}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.icon}
                  <span className="text-xs sm:text-sm">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 sm:h-10 sm:w-10 text-foreground/70 hover:text-primary focus-visible:ring-primary"
            aria-label={theme === 'dark' ? "切換至淺色模式" : "切換至深色模式"}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {isLoadingAuth ? (
            <div className="h-10 w-20 flex items-center justify-center">
               <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : user ? ( 
            <>
              <Button variant="ghost" asChild>
                <Link href="/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  個人資料
                </Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                登出
              </Button>
            </>
          ) : (
            !isWelcomePage && (
              <Button asChild>
                <Link href="/welcome">
                  <LogIn className="mr-2 h-4 w-4" />
                  登入 / 註冊
                </Link>
              </Button>
            )
          )}
        </div>
      </nav>
    </header>
  );
};
