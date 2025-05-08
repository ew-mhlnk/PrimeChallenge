'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { label: 'Активные', path: '/' },
  { label: 'Архив', path: '/archive' },
  { label: 'Лидерборд', path: '/leaderboard' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = container.querySelectorAll('button');
    const index = navItems.findIndex((item) => item.path === pathname);
    const activeButton = buttons[index] as HTMLButtonElement;

    if (activeButton) {
      const { offsetLeft, offsetWidth } = activeButton;
      setIndicatorStyle({
        left: offsetLeft,
        width: offsetWidth,
      });
    }
  }, [pathname]);

  return (
    <div className="fixed bottom-[100px] w-full flex justify-center z-50">
      <nav className="bg-[#1B1A1F] h-[39px] px-4 flex justify-center items-center rounded-full">
        <div
          ref={containerRef}
          className="relative flex gap-[32px] items-center h-[39px] max-w-[90vw]"
        >
          {/* Индикатор */}
          <div
            style={{
              width: indicatorStyle.width,
              transform: `translateX(${indicatorStyle.left}px)`,
            }}
            className="absolute top-1/2 -translate-y-1/2 h-[29px] bg-[#131215] rounded-[14.5px] border border-[#141414] transition-all duration-300 ease-in-out"
          />

          {/* Кнопки */}
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`relative z-10 px-[15px] py-[5px] text-[16px] font-medium transition-all duration-300 ease-in-out ${
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
