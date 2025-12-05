'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useEffect, useState } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// --- ИКОНКИ (SF Symbols Style) ---

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M3 9.5L12 2.5L21 9.5V20.5C21 21.0523 20.5523 21.5 20 21.5H15V15.5H9V21.5H4C3.44772 21.5 3 21.0523 3 20.5V9.5Z" 
      stroke={active ? "white" : "#8E8E93"} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill={active ? "white" : "none"} // Заливка при активности
    />
  </svg>
);

const TrophyIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 21H16" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 17V21" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 4H18C18 4 19 4 19 10C19 15 12 17 12 17C12 17 5 15 5 10C5 4 6 4 6 4Z" 
      stroke={active ? "white" : "#8E8E93"} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill={active ? "white" : "none"}
    />
  </svg>
);

const ChartIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 20V10" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 20V4" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 20V14" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ProfileIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke={active ? "white" : "#8E8E93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" 
      stroke={active ? "white" : "#8E8E93"} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      fill={active ? "white" : "none"}
    />
  </svg>
);

// --- КОНФИГУРАЦИЯ МЕНЮ ---

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

  // Скрываем меню внутри турнира
  const isTournamentPage = pathname.startsWith('/tournament/');

  useEffect(() => {
    // Скрываем при скролле вниз, показываем при скролле вверх
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
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="
              pointer-events-auto
              bg-[#121212]/85 
              backdrop-blur-xl 
              border border-white/10 
              rounded-[32px] 
              p-2
              shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
              flex items-center gap-1
              w-auto
              max-w-[95%]
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
                  className="relative group"
                >
                  <motion.div
                    className={`
                      relative flex items-center justify-center gap-2 px-4 py-3 rounded-[24px] overflow-hidden cursor-pointer
                      transition-colors duration-300
                    `}
                  >
                    {/* Анимированный фон для активного элемента */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill-bg"
                        className="absolute inset-0 bg-[#2C2C2E] border border-white/5 rounded-[24px]"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    {/* Иконка */}
                    <div className="relative z-10 flex-shrink-0">
                      <Icon active={isActive} />
                    </div>

                    {/* Текст (Скрывается/Появляется) */}
                    <AnimatePresence mode="popLayout">
                        {isActive && (
                            <motion.span
                                initial={{ width: 0, opacity: 0, x: -10 }}
                                animate={{ width: "auto", opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: -10 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="relative z-10 text-[13px] font-semibold text-white whitespace-nowrap overflow-hidden"
                            >
                                {item.label}
                            </motion.span>
                        )}
                    </AnimatePresence>
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