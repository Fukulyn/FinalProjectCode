"use client";

import Link from 'next/link';
import { Dog, Heart, UserCircle, LogIn, LogOut, Sun, Moon, FileText, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePawsConnect } from '@/context/PawsConnectContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { useState } from 'react';

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoadingAuth } = usePawsConnect();
  const { theme, toggleTheme } = useTheme();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navItems = [
    { href: '/', label: '滑卡配對', icon: <Dog className="h-5 w-5" />, requiresAuth: true },
    { href: '/matches', label: '我的配對', icon: <Heart className="h-5 w-5" />, requiresAuth: true },
    { href: '/adoption-info', label: '領養資訊', icon: <FileText className="h-5 w-5" />, requiresAuth: false },
  ];
  
  const isWelcomePage = pathname === '/welcome';

  const handleLogout = async () => {
    await logout();
    setIsSheetOpen(false); // 登出後關閉導航欄
    router.push('/welcome');
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href={user ? "/" : "/welcome"} className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
          <Dog className="h-8 w-8" />
          <h1 className="text-2xl font-headline font-bold">PawsConnect</h1>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {!isWelcomePage && navItems.map((item) => {
            if (item.requiresAuth && !user) return null;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex items-center gap-2 p-2 h-10",
                    pathname === item.href ? "text-primary font-semibold" : "text-foreground/70 hover:text-primary"
                  )}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 text-foreground/70 hover:text-primary focus-visible:ring-primary"
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

        {/* Mobile Navigation with Sheet */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 text-foreground/70 hover:text-primary focus-visible:ring-primary"
            aria-label={theme === 'dark' ? "切換至淺色模式" : "切換至深色模式"}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="打開導航選單">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Dog className="h-6 w-6" />
                  PawsConnect
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 py-4">
                {/* Navigation Links inside Sheet */}
                {!isWelcomePage && navItems.map((item) => {
                  if (item.requiresAuth && !user) return null;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setIsSheetOpen(false)}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start flex items-center gap-2 text-base",
                          pathname === item.href ? "text-primary font-semibold" : "text-foreground/70 hover:text-primary"
                        )}
                        aria-current={pathname === item.href ? "page" : undefined}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
              <SheetFooter className="flex-col gap-2 mt-auto">
                {/* Auth Buttons inside Sheet */}
                {isLoadingAuth ? (
                  <div className="w-full flex justify-center py-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : user ? (
                  <>
                    <Link href="/profile" className="w-full" onClick={() => setIsSheetOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        <UserCircle className="mr-2 h-4 w-4" />
                        個人資料
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      登出
                    </Button>
                  </>
                ) : (
                  !isWelcomePage && (
                    <Link href="/welcome" className="w-full" onClick={() => setIsSheetOpen(false)}>
                      <Button className="w-full">
                        <LogIn className="mr-2 h-4 w-4" />
                        登入 / 註冊
                      </Button>
                    </Link>
                  )
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
};