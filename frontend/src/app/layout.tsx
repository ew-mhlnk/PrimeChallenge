import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";
import Navigation from '@/components/Navigation';
import { Toaster } from 'react-hot-toast';
import { TournamentProvider } from '@/context/TournamentContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { Suspense } from "react"; 
import { YandexMetrica } from "@/components/YandexMetrica";

// Стандартный шрифт
const inter = Inter({ subsets: ["latin"] });

// --- КАСТОМНЫЕ ШРИФТЫ ---
// Убедитесь, что файлы лежат в public/fonts/
const cyberBrush = localFont({
  src: '../../public/fonts/CyberBrush.otf', 
  variable: '--font-cyber',
  display: 'swap',
});

const visby = localFont({
  src: '../../public/fonts/VisbyCF.otf', 
  variable: '--font-visby',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Prime Bracket Challenge",
  description: "Tennis Fantasy Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 👇 ГЛАВНОЕ ИСПРАВЛЕНИЕ: suppressHydrationWarning
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      
      {/* 👇 Восстановил классы шрифтов и фона, чтобы дизайн работал */}
      <body className={`
        ${inter.className} 
        ${cyberBrush.variable} 
        ${visby.variable} 
        bg-[#141414] text-white antialiased
      `}>
        <TournamentProvider>
          <ProfileProvider>
            <Toaster position="top-center" />
            
            {/* Метрика */}
            <Suspense fallback={null}>
               <YandexMetrica />
            </Suspense>

            {children}
            <Navigation />
          </ProfileProvider>
        </TournamentProvider>
      </body>
    </html>
  );
}