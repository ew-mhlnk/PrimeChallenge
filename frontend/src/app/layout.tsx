import './globals.css';
import Navigation from '../components/Navigation';
import { Toaster } from 'react-hot-toast';
import { TournamentProvider } from '@/context/TournamentContext'; // <--- ИМПОРТ

// ... metadata ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" 
        />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body className="bg-[#141414] text-white antialiased">
        {/* ОБОРАЧИВАЕМ ВСЁ В PROVDER */}
        <TournamentProvider>
          <Toaster position="top-center" />
          {children}
          <Navigation />
        </TournamentProvider>
      </body>
    </html>
  );
}