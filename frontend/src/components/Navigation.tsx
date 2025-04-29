'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const navItems = [
  { label: 'Активные', path: '/' },
  { label: 'Архив', path: '/archive' },
  { label: 'Лидерборд', path: '/leaderboard' },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = navItems.findIndex((item) => pathname === item.path);
    const indicator = indicatorRef.current;
    if (indicator && index >= 0) {
      indicator.style.transform = `translateX(${index * 190}px)`; // 120px (ширина кнопки) + 70px (space-x-[70px])
    }
  }, [pathname]);

  return (
    <nav className="bg-[#1B1A1F] w-full h-[39px] flex justify-center items-center">
      <div className="relative flex space-x-[70px]">
        <div
          ref={indicatorRef}
          className="absolute top-1/2 -translate-y-1/2 w-[120px] h-[29px] bg-[#131215] rounded-[16.5px] border border-[#141414] transition-transform duration-300 ease-in-out"
        />
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`relative z-10 w-[120px] h-[29px] flex items-center justify-center text-[#FFFFFF] text-[14px] font-medium ${
              pathname === item.path ? 'font-bold' : ''
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}