import './globals.css';

export const metadata = {
  title: 'Prime Bracket Challenge',
  description: 'A bracket challenge application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://telegram.org/js/telegram-web-app.js"
          async
          onLoad={() => console.log('Telegram WebApp script loaded successfully')}
          onError={() => console.error('Failed to load Telegram WebApp script')}
        />
      </head>
      <body className="bg-[#141414] text-white">{children}</body>
    </html>
  );
}