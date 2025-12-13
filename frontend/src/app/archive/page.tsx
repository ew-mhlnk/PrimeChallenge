'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useTournaments from '../../hooks/useTournaments';
import { TournamentListItem } from '@/components/tournament/TournamentListItem';

// --- ИКОНКИ ---
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

// --- ХЕЛПЕРЫ ---
// Парсит строку "01.2026" в объект для сортировки и отображения
const parseMonth = (monthStr: string) => {
    const monthsShort = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    
    if (!monthStr || !monthStr.includes('.')) return { label: 'TBA', year: 9999, index: 99, sortVal: 999999 };

    const [m, y] = monthStr.split('.').map(Number);
    const mIdx = m - 1;
    
    return {
        label: monthsShort[mIdx] || '?',
        year: y,
        index: m,
        sortVal: y * 100 + m // Пример: 202601
    };
};

// --- КОМПОНЕНТ ФИЛЬТРА ТЕГОВ ---
const FilterPill = ({ label, isActive, onClick, colorClass }: { label: string, isActive: boolean, onClick: () => void, colorClass: string }) => (
    <button
      onClick={onClick}
      className={`
        relative px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 flex-shrink-0
        ${isActive ? 'text-white shadow-lg scale-105' : 'text-[#8E8E93] bg-[#1C1C1E] border border-white/5'}
      `}
    >
      {isActive && (
        <motion.div
          layoutId="archiveTagBg"
          className={`absolute inset-0 rounded-full -z-10 ${colorClass}`}
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <span className={`relative z-10 ${isActive && label === 'ТБШ' ? 'text-black/80' : ''}`}>
        {label}
      </span>
    </button>
);

export default function TournamentsPage() {
  const router = useRouter();
  const { tournaments, error, isLoading } = useTournaments();
  
  // --- СОСТОЯНИЯ ---
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');

  const filters = [
    { label: 'ВСЕ', color: 'bg-[#007AFF]' },
    { label: 'ATP', color: 'bg-[#002BFF]' },
    { label: 'WTA', color: 'bg-[#7B00FF]' },
    { label: 'ТБШ', color: 'bg-gradient-to-r from-[#FDF765] to-[#DAB07F]' },
  ];

  // 1. Получаем список уникальных месяцев из данных
  const availableMonths = useMemo(() => {
      if (!tournaments) return [];
      const months = Array.from(new Set(tournaments.map(t => t.month).filter(Boolean) as string[]));
      
      // Сортируем хронологически (2025 -> 2026)
      return months.sort((a, b) => {
          return parseMonth(a).sortVal - parseMonth(b).sortVal;
      });
  }, [tournaments]);

  // 2. Инициализация месяца (Умный выбор)
  useEffect(() => {
      // Если месяц еще не выбран и данные загрузились
      if (!selectedMonth && availableMonths.length > 0) {
          const now = new Date();
          // Текущий месяц: "01.2025" (или 12.2025)
          const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
          
          // Проверяем: есть ли текущий месяц в базе?
          if (availableMonths.includes(currentMonthStr)) {
              setSelectedMonth(currentMonthStr);
          } else {
              // Если нет (например, сейчас 2025, а данные за 2026),
              // берем ПЕРВЫЙ доступный месяц из списка
              setSelectedMonth(availableMonths[0]);
          }
      }
  }, [availableMonths, selectedMonth]);

  // 3. Фильтрация списка
  const filteredList = useMemo(() => {
      if (!tournaments) return [];
      return tournaments.filter(t => {
          // Фильтр по месяцу
          if (selectedMonth && t.month !== selectedMonth) return false;
          // Фильтр по тегу
          if (selectedTag !== 'ВСЕ' && t.tag !== selectedTag) return false;
          return true;
      });
  }, [tournaments, selectedMonth, selectedTag]);

  // Получаем год для отображения в заголовке
  const displayYear = selectedMonth ? parseMonth(selectedMonth).year : '';

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32 relative">
      
      {/* --- HEADER --- */}
      <header className="pt-8 pb-2 bg-[#141414] sticky top-0 z-30 border-b border-white/5">
        <div className="px-6 flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
                <button 
                onClick={() => router.back()} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
                >
                <BackIcon />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-[20px] font-bold text-white leading-none">Календарь</h1>
                    {/* Показываем год выбранного месяца */}
                    {displayYear && <span className="text-[12px] text-[#5F6067] font-medium mt-0.5">{displayYear} год</span>}
                </div>
            </div>
            
            {/* Декоративная иконка (можно сделать кнопкой выбора года в будущем) */}
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 opacity-50">
                <CalendarIcon />
            </div>
        </div>

        {/* --- ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ МЕСЯЦЕВ (TENNISBB STYLE) --- */}
        <div className="w-full overflow-x-auto scrollbar-hide px-6 pb-3">
            <div className="flex gap-3 min-w-min">
                {availableMonths.map((monthStr) => {
                    const isActive = selectedMonth === monthStr;
                    const { label } = parseMonth(monthStr);

                    return (
                        <button
                            key={monthStr}
                            onClick={() => setSelectedMonth(monthStr)}
                            className={`
                                relative px-4 py-2.5 rounded-[14px] text-[13px] font-bold transition-all duration-300 flex-shrink-0
                                ${isActive 
                                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-105' 
                                    : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/5 hover:bg-[#2C2C2E]'
                                }
                            `}
                        >
                            {label}
                        </button>
                    );
                })}
                
                {/* Если месяцев нет, показываем заглушку */}
                {availableMonths.length === 0 && !isLoading && (
                    <span className="text-[#5F6067] text-sm py-2">Нет данных</span>
                )}
            </div>
        </div>
      </header>

      {/* --- ФИЛЬТРЫ ТЕГОВ --- */}
      <div className="sticky top-[110px] z-20 bg-[#141414]/95 backdrop-blur-md pb-4 pt-4 border-b border-white/5">
          <div className="flex gap-2 px-6 overflow-x-auto scrollbar-hide">
            {filters.map((f) => (
              <FilterPill 
                key={f.label} 
                label={f.label} 
                isActive={selectedTag === f.label}
                colorClass={f.color}
                onClick={() => setSelectedTag(f.label)}
              />
            ))}
          </div>
      </div>

      {/* --- СПИСОК ТУРНИРОВ --- */}
      <main className="px-4 flex flex-col gap-3 mt-4 min-h-[300px]">
        {isLoading ? (
            <div className="flex justify-center mt-10">
                <div className="w-6 h-6 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin"></div>
            </div>
        ) : error ? (
            <p className="text-red-500 text-center mt-10 text-sm">{error}</p>
        ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-3">
                <p className="text-sm font-medium">Нет турниров</p>
            </div>
        ) : (
            <div className="flex flex-col gap-3">
                <AnimatePresence mode="wait">
                    {filteredList.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TournamentListItem tournament={t} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
      </main>

    </div>
  );
}