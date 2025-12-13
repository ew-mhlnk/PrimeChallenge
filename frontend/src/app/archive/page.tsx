'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useTournaments from '../../hooks/useTournaments';
// Используем 'import type' для чистоты, и мы используем его ниже в Record<...>
import type { Tournament } from '@/types'; 
import { TournamentListItem } from '@/components/tournament/TournamentListItem';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

// Хелпер для парсинга и форматирования месяца
const parseMonth = (monthStr: string) => {
    const months = [
        'ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН',
        'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'
    ];
    
    if (!monthStr || !monthStr.includes('.')) return { label: 'TBA', full: 'TBA', sortVal: 999999 };

    const [m, y] = monthStr.split('.').map(Number);
    const mIdx = m - 1;
    
    return {
        label: months[mIdx] || '?',
        full: monthStr,
        sortVal: y * 100 + m 
    };
};

export default function TournamentsPage() {
  const router = useRouter();
  const { tournaments, error, isLoading } = useTournaments();
  
  // Состояние выбранного месяца
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // 1. Группировка турниров по месяцам
  // ВАЖНО: Здесь мы используем Tournament в конструкции 'as Record<string, Tournament[]>'
  // Это убирает ошибку ESLint и дает строгую типизацию
  const groupedTournaments = (tournaments || []).reduce((acc, t) => {
      const key = t.month || 'TBA';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
  }, {} as Record<string, Tournament[]>);

  // 2. Получаем уникальные ключи месяцев для сортировки
  const availableMonths = Object.keys(groupedTournaments);

  // 3. Сортируем их хронологически
  const sortedMonths = availableMonths.sort((a, b) => {
      const pA = parseMonth(a);
      const pB = parseMonth(b);
      return pA.sortVal - pB.sortVal;
  });

  // 4. Авто-выбор текущего месяца при загрузке
  useEffect(() => {
      if (sortedMonths.length > 0 && !selectedMonth) {
          const now = new Date();
          const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
          
          if (sortedMonths.includes(currentMonthStr)) {
              setSelectedMonth(currentMonthStr);
          } else {
              setSelectedMonth(sortedMonths[0]);
          }
      }
  }, [sortedMonths, selectedMonth]);

  // 5. Фильтруем список для отображения
  const currentList = selectedMonth ? (groupedTournaments[selectedMonth] || []) : [];

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32">
      
      {/* Header */}
      <header className="px-6 pt-8 pb-2 flex items-center gap-4 bg-[#141414] sticky top-0 z-20">
        <button 
          onClick={() => router.back()} 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
        >
          <BackIcon />
        </button>
        <h1 className="text-[22px] font-bold text-white">Календарь</h1>
      </header>

      {/* Month Selector (Горизонтальный скролл) */}
      <div className="sticky top-[60px] z-20 bg-[#141414] pb-4 pt-2 border-b border-white/5">
          <div className="flex gap-3 px-6 overflow-x-auto scrollbar-hide">
              {sortedMonths.map(monthStr => {
                  const isActive = selectedMonth === monthStr;
                  const { label } = parseMonth(monthStr);
                  
                  return (
                      <button
                          key={monthStr}
                          onClick={() => setSelectedMonth(monthStr)}
                          className={`
                              relative px-4 py-2 rounded-full text-[13px] font-bold transition-all duration-300 flex-shrink-0
                              ${isActive ? 'text-black' : 'text-[#8E8E93] bg-[#1C1C1E] border border-white/5'}
                          `}
                      >
                          {isActive && (
                              <motion.div
                                  layoutId="month-pill"
                                  className="absolute inset-0 bg-white rounded-full -z-10"
                                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                          )}
                          <span className="relative z-10">{label}</span>
                      </button>
                  );
              })}
          </div>
      </div>

      <main className="px-4 flex flex-col gap-3 mt-4">
        {isLoading ? (
            <p className="text-[#5F6067] text-center mt-10">Загрузка...</p>
        ) : error ? (
            <p className="text-red-500 text-center mt-10">Ошибка: {error}</p>
        ) : sortedMonths.length === 0 ? (
            <div className="text-center py-20 opacity-50">Календарь пуст</div>
        ) : (
            <div className="flex flex-col min-h-[300px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedMonth || 'empty'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {currentList.length > 0 ? (
                            currentList.map(t => (
                                <TournamentListItem key={t.id} tournament={t} />
                            ))
                        ) : (
                            <p className="text-[#5F6067] text-center mt-10">В этом месяце турниров нет</p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        )}
      </main>
    </div>
  );
}