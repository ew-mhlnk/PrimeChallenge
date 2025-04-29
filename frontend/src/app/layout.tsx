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
        />
      </head>
      <body className="bg-[#141414] text-white pb-[39px]">{children}</body>
    </html>
  );
}