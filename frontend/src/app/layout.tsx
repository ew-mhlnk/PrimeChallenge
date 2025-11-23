import './globals.css';
import Navigation from '../components/Navigation';
import { Toaster } from 'react-hot-toast'; // Не забудь тостер, если используешь

export const metadata = {
  title: 'Prime Bracket Challenge',
  description: 'Tennis Fantasy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {/* Важный метатег для Telegram WebApp на мобилках */}
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" 
        />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="bg-[#141414] text-white antialiased">
        <Toaster position="top-center" />
        {children}
        <Navigation />
      </body>
    </html>
  );
}