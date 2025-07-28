
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from '@/components/layout/Navbar';
import { PawsConnectProvider } from '@/context/PawsConnectContext';
import { ThemeProvider } from '@/context/ThemeContext'; // Import ThemeProvider

export const metadata: Metadata = {
  title: 'PawsConnect - 尋找您的毛茸茸夥伴',
  description: '一個採用滑動配對系統來領養流浪狗的平台。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <ThemeProvider> {/* Wrap with ThemeProvider */}
          <PawsConnectProvider>
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <Toaster />
          </PawsConnectProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
