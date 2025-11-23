'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useEffect, useState } from 'react';

const navItems = [
  { label: 'Активные', path: '/' },
  { label: 'Архив', path: '/archive' },
  { label: 'Лидерборд', path: '/leaderboard' },
];

export default function Navigation() {
  const pathname = usePathname();
  const scrollDirection = useScrollDirection();
  const [isVisible, setIsVisible] = useState(true);

  // Логика скрытия: если скроллим вниз — скрываем, если вверх или мы на самом верху — показываем
  useEffect(() => {
    if (scrollDirection === 'down' && window.scrollY > 50) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [scrollDirection]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[30px] px-4 pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="
              pointer-events-auto
              bg-[#1B1A1F]/90 
              backdrop-blur-md 
              border border-white/10 
              rounded-full 
              p-1.5 
              shadow-2xl 
              shadow-black/50
              flex items-center gap-1
              max-w-[400px] w-full justify-between sm:w-auto
            "
          >
            {navItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className="relative flex-1 sm:flex-none text-center"
                >
                  <button
                    className={`
                      relative z-10 px-5 py-2.5 text-sm font-medium transition-colors duration-200 w-full
                      ${isActive ? 'text-white' : 'text-[#8E8E93] hover:text-white/70'}
                    `}
                  >
                    {/* Текст кнопки */}
                    {item.label}

                    {/* Плавающая плашка (индикатор) */}
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="absolute inset-0 bg-[#323236] rounded-full -z-10 border border-white/5"
                      />
                    )}
                  </button>
                </Link>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}