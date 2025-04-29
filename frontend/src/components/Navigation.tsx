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
      // 102px (ширина кнопки) + 32px (отступы между кнопками)
      indicator.style.transform = `translateX(${index * (102 + 32)}px)`;
    }
  }, [pathname]);

  return (
    <nav className="bg-[#1B1A1F] w-full h-[39px] flex justify-center items-center">
      <div
        data-layer="Rectangle 543"
        className="Rectangle543 relative flex justify-center items-center gap-[32px] w-[430px] max-w-[90vw] h-[39px]"
      >
        <div
          ref={indicatorRef}
          data-layer="Rectangle 544"
          className="Rectangle544 absolute top-1/2 -translate-y-1/2 w-[102px] h-[29px] bg-[#131215] rounded-[16.5px] border border-[#141414] transition-transform duration-300 ease-in-out"
        />
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={`relative z-10 px-[15px] py-[5px] text-[16px] font-medium ${
              pathname === item.path ? 'text-[#CCCCCC]' : 'text-[#5F6067]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}