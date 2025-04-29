import './globals.css';

export const metadata = {
  title: 'Prime Bracket Challenge',
  description: 'A bracket challenge application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#141414] text-white">{children}</body>
    </html>
  );
}