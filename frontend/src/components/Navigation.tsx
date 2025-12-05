'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useEffect, useState } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// --- ИКОНКИ (SVG) ---
// Делаем их чуть компактнее для аккуратности

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300">
    <path d="M3 9.5L12 2.5L21 9.5V20.5C21 21.0523 20.5523 21.5 20 21.5H15V15.5H9V21.5H4C3.44772 21.5 3 21.0523 3 20.5V9.5Z" fill={active ? "white" : "none"} />
  </svg>
);

const TrophyIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-300">
    <path d="M8 21H16" />
    <path d="M12 17V21" />
    <path d="M6 4H18C18 4 19 4 19 10C19 15 12 17 12 17C12 17 5 15 5 10C5 4 6 4 6 4Z" fill={active ? "white" : "none"} />
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
  { label: 'Турниры', path: '/archive', icon: TrophyIcon },
  { label: 'Лидеры', path: '/leaderboard', icon: ChartIcon },
  { label: 'Профиль', path: '/profile', icon: ProfileIcon },
];

export default function Navigation() {
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();
  const [isVisible, setIsVisible] = useState(true);
  const { impact } = useHapticFeedback();

  const isTournamentPage = pathname.startsWith('/tournament/');

  useEffect(() => {
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
      style={{ bottom: 'calc(20px + env(safe-area-inset-bottom))' }} 
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
                    layout // <-- МАГИЯ: Заставляет соседние элементы плавно двигаться
                    className={`
                      relative flex items-center justify-center rounded-[28px] cursor-pointer
                      ${isActive ? 'px-4 py-3' : 'px-3 py-3'}
                    `}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    {/* Фон активного элемента */}
                    {isActive && (
                      <motion.div
                        layoutId="active-pill-bg" // <-- Общий ID для плавного перетекания фона
                        className="absolute inset-0 bg-[#3A3A3C] rounded-[28px]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Контейнер для контента (чтобы он был поверх фона) */}
                    <div className="relative z-10 flex items-center gap-2">
                        {/* Иконка */}
                        <Icon active={isActive} />

                        {/* Текст с анимацией ширины и блюра */}
                        <motion.span
                            initial={false}
                            animate={{
                                width: isActive ? "auto" : 0,
                                opacity: isActive ? 1 : 0,
                                filter: isActive ? "blur(0px)" : "blur(4px)",
                                // Сдвигаем текст, чтобы он не "прилипал" при исчезновении
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