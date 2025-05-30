'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { label: 'Активные', path: '/' },
  { label: 'Архив', path: '/archive' },
  { label: 'Лидерборд', path: '/leaderboard' },
];

export default function FancyTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = container.querySelectorAll('button');
    const index = navItems.findIndex((item) => item.path === pathname);
    const activeButton = buttons[index] as HTMLButtonElement;

    if (activeButton) {
      const { offsetLeft, offsetWidth } = activeButton;
      setIndicator({
        left: offsetLeft,
        width: offsetWidth,
      });
    }
  }, [pathname]);

  return (
    <div className="fixed bottom-[50px] w-full flex justify-center z-50">
      <nav className="relative bg-[#1B1A1F] h-[39px] flex items-center w-full max-w-[600px] px-[55px] rounded-none">
        <div
          ref={containerRef}
          className="relative flex items-center justify-between w-full h-full"
        >
          {/* Анимированный индикатор */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[29px] bg-[#131215] border border-[#141414] rounded-[14.5px] transition-all duration-300 ease-[cubic-bezier(0.4, 0, 0.2, 1)]"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px) translateY(-50%)`,
            }}
          />

          {/* Кнопки */}
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`relative z-10 text-[16px] font-medium px-[15px] py-[5px] transition-colors duration-200 ${
                  isActive ? 'text-[#CCCCCC]' : 'text-[#5F6067]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
