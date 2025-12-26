'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useEffect, useState } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// --- ИКОНКИ ---

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300">
    <path d="M3 9.5L12 2.5L21 9.5V20.5C21 21.0523 20.5523 21.5 20 21.5H15V15.5H9V21.5H4C3.44772 21.5 3 21.0523 3 20.5V9.5Z" fill={active ? "white" : "none"} />
  </svg>
);

// НОВАЯ ИКОНКА ОГНЯ (ДЛЯ ДЕЙЛИ)
const FireIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#FF453A" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300">
    <path d="M12 2c0 0-3 3.5-3 6 0 1.5 1 3 1 3s-3-1-3-4c0 0-3 2-3 6 0 4.418 3.582 8 8 8s8-3.582 8-8c0-4-3-6-3-6s0 3 0 4c0 0 1-1.5 1-3 0-2.5-3-6-3-6z" fill={active ? "#FF453A" : "none"} />
  </svg>
);

const ListIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ChartIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300">
    <path d="M18 20V10" />
    <path d="M12 20V4" />
    <path d="M6 20V14" />
  </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300">
    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" />
    <circle cx="12" cy="7" r="4" fill={active ? "white" : "none"} />
  </svg>
);

// --- КОНФИГУРАЦИЯ ---

const navItems = [
  { label: 'Главная', path: '/', icon: HomeIcon },
  { label: 'Дейли', path: '/daily', icon: FireIcon }, // <--- ВТОРОЙ ПУНКТ
  { label: 'Турниры', path: '/archive', icon: ListIcon },
  { label: 'Лидеры', path: '/leaderboard', icon: ChartIcon },
  { label: 'Профиль', path: '/profile', icon: ProfileIcon },
];

export default function Navigation() {
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();
  const [isVisible, setIsVisible] = useState(true);
  const { impact } = useHapticFeedback();

  // Скрываем меню на страницах конкретного турнира (там своя навигация или дизайн)
  const isTournamentPage = pathname.startsWith('/tournament/');

  useEffect(() => {
    // Скрываем меню при скролле вниз
    if (scrollDirection === 'down' && window.scrollY > 50) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [scrollDirection]);

  if (isTournamentPage) return null;

  return (
    <div 
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ bottom: 'calc(34px + env(safe-area-inset-bottom))' }} 
    >
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="
              pointer-events-auto
              bg-[#121212]/80 
              backdrop-blur-xl 
              border border-white/10 
              rounded-[36px] 
              p-1.5
              shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]
              flex items-center
              w-auto
              overflow-hidden
            "
          >
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;

              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => !isActive && impact('light')}
                  className="relative flex items-center"
                >
                  <motion.div
                    layout
                    className={`
                      relative flex items-center justify-center rounded-[28px] cursor-pointer
                      ${isActive ? 'px-4 py-3' : 'px-3 py-3'}
                    `}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    {/* Фон активного элемента */}
                    {isActive && (
                      <motion.div
                        layoutId="active-pill-bg"
                        className="absolute inset-0 bg-[#3A3A3C] rounded-[28px]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <div className="relative z-10 flex items-center gap-2">
                        <Icon active={isActive} />

                        <motion.span
                            initial={false}
                            animate={{
                                width: isActive ? "auto" : 0,
                                opacity: isActive ? 1 : 0,
                                filter: isActive ? "blur(0px)" : "blur(4px)",
                                marginLeft: isActive ? 4 : 0 
                            }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 500, 
                                damping: 35,
                                mass: 0.8
                            }}
                            className="overflow-hidden whitespace-nowrap text-[13px] font-semibold text-white"
                        >
                            {item.label}
                        </motion.span>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}