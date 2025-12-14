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
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
);

const ChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6 6 6"/></svg>
);

// --- ХЕЛПЕРЫ ---
const parseMonth = (monthStr: string) => {
    const monthsShort = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    const monthsFull = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    if (!monthStr || typeof monthStr !== 'string' || !monthStr.includes('.')) {
        return { label: '?', fullLabel: '?', year: 2025, index: 0, sortVal: 999999 };
    }

    const [m, y] = monthStr.split('.').map(Number);
    const mIdx = m - 1;
    
    return {
        label: monthsShort[mIdx] || '?',
        fullLabel: monthsFull[mIdx] || '?',
        year: y,
        index: m,
        sortVal: y * 100 + m 
    };
};

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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear()); // Год внутри модалки

  const filters = [
    { label: 'ВСЕ', color: 'bg-[#007AFF]' },
    { label: 'ATP', color: 'bg-[#002BFF]' },
    { label: 'WTA', color: 'bg-[#7B00FF]' },
    { label: 'ТБШ', color: 'bg-gradient-to-r from-[#FDF765] to-[#DAB07F]' },
  ];

  // 1. Получаем данные
  const { years, months } = useMemo(() => {
      if (!tournaments || tournaments.length === 0) return { years: [], months: [] };
      
      const uniqueMonths = Array.from(new Set(tournaments.map(t => t.month).filter(Boolean) as string[]));
      const sortedMonths = uniqueMonths.sort((a, b) => parseMonth(a).sortVal - parseMonth(b).sortVal);
      const uniqueYears = Array.from(new Set(sortedMonths.map(m => parseMonth(m).year))).sort((a, b) => a - b);
      
      return { years: uniqueYears, months: sortedMonths };
  }, [tournaments]);

  // 2. Инициализация
  useEffect(() => {
      if (!selectedYear && years.length > 0) {
          const currentYear = new Date().getFullYear();
          const startYear = years.includes(currentYear) ? currentYear : years[0];
          setSelectedYear(startYear);
          setPickerYear(startYear);
      }
  }, [years, selectedYear]);

  // 3. Авто-выбор месяца
  useEffect(() => {
      if (selectedYear && months.length > 0) {
          const currentMonthYear = selectedMonth ? parseMonth(selectedMonth).year : -1;
          
          if (currentMonthYear !== selectedYear) {
              const firstMonthOfYear = months.find(m => parseMonth(m).year === selectedYear);
              if (firstMonthOfYear) setSelectedMonth(firstMonthOfYear);
          }
      }
  }, [selectedYear, months, selectedMonth]);

  // 4. Фильтрация
  const visibleMonths = months.filter(m => parseMonth(m).year === selectedYear);

  const filteredList = useMemo(() => {
      if (!tournaments) return [];
      return tournaments.filter(t => {
          if (selectedMonth && t.month !== selectedMonth) return false;
          if (selectedTag !== 'ВСЕ' && t.tag !== selectedTag) return false;
          return true;
      });
  }, [tournaments, selectedMonth, selectedTag]);

  // Обработчик выбора месяца в модалке
  const handleModalMonthSelect = (monthIndex: number) => {
      // Формируем строку месяца, например "01.2026"
      const mStr = String(monthIndex + 1).padStart(2, '0');
      const targetMonthStr = `${mStr}.${pickerYear}`;
      
      // Проверяем, есть ли такой месяц в данных (опционально, можно и просто переключить)
      // Если данных нет, список будет пуст, это нормально.
      
      setSelectedYear(pickerYear);
      setSelectedMonth(targetMonthStr);
      setIsDatePickerOpen(false);
  };

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
                    {/* Убрали текстовую кнопку года отсюда */}
                </div>
            </div>
            
            {/* Кнопка календаря - ОТКРЫВАЕТ МОДАЛКУ */}
            <button 
                onClick={() => {
                    setPickerYear(selectedYear || new Date().getFullYear());
                    setIsDatePickerOpen(true);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform text-[#00B2FF]"
            >
                <CalendarIcon />
            </button>
        </div>

        {/* --- ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ (Оставляем для удобства внутри года) --- */}
        <div className="w-full overflow-x-auto scrollbar-hide px-6 pb-3">
            <div className="flex gap-3 min-w-min">
                {visibleMonths.map((monthStr) => {
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
            </div>
        </div>
      </header>

      {/* --- ФИЛЬТРЫ ТЕГОВ --- */}
      <div className="sticky top-[110px] z-20 bg-[#141414]/95 backdrop-blur-md pb-4 pt-4 border-b border-white/5">
          <div className="flex gap-2 px-6 overflow-x-auto scrollbar-hide">
            {filters.map((f) => (
              <FilterPill key={f.label} label={f.label} isActive={selectedTag === f.label} colorClass={f.color} onClick={() => setSelectedTag(f.label)} />
            ))}
          </div>
      </div>

      {/* --- СПИСОК ТУРНИРОВ --- */}
      <main className="px-4 flex flex-col gap-3 mt-4 min-h-[300px]">
        {isLoading ? (
            <div className="flex justify-center mt-10"><div className="w-6 h-6 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin"></div></div>
        ) : error ? (
            <p className="text-red-500 text-center mt-10 text-sm">{error}</p>
        ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-3"><p className="text-sm font-medium">Нет турниров</p></div>
        ) : (
            <div className="flex flex-col gap-3">
                <AnimatePresence mode="wait">
                    {filteredList.map(t => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                            <TournamentListItem tournament={t} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
      </main>

      {/* --- НОВАЯ МОДАЛКА (ГОД + МЕСЯЦЫ) --- */}
      <AnimatePresence>
        {isDatePickerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                {/* Фон */}
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsDatePickerOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                {/* Окно */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-[320px] bg-[#1C1C1E] border border-white/10 rounded-[32px] p-5 shadow-2xl z-10 overflow-hidden"
                >
                    {/* Хедер модалки: Выбор года */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 bg-black/30 rounded-full p-1 border border-white/5">
                            <button 
                                onClick={() => setPickerYear(prev => prev - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#8E8E93] hover:text-white transition-colors"
                            >
                                <ChevronLeft />
                            </button>
                            <span className="text-[17px] font-bold text-white font-mono px-2">
                                {pickerYear}
                            </span>
                            <button 
                                onClick={() => setPickerYear(prev => prev + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#8E8E93] hover:text-white transition-colors"
                            >
                                <ChevronRight />
                            </button>
                        </div>

                        <button onClick={() => setIsDatePickerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#8E8E93] hover:text-white">
                            <CloseIcon />
                        </button>
                    </div>
                    
                    {/* Сетка месяцев */}
                    <div className="grid grid-cols-3 gap-3">
                        {['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сент', 'Окт', 'Ноя', 'Дек'].map((mName, idx) => {
                            // Формируем полный ID месяца для проверки (01.2026)
                            const currentPickerMonthStr = `${String(idx + 1).padStart(2, '0')}.${pickerYear}`;
                            
                            // Проверяем, выбран ли этот месяц ВООБЩЕ (в текущем просмотре)
                            const isSelected = selectedMonth === currentPickerMonthStr;
                            
                            // Проверяем, есть ли данные за этот месяц (чтобы подсветить доступные)
                            const hasData = months.includes(currentPickerMonthStr);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleModalMonthSelect(idx)}
                                    disabled={!hasData && false} // Можно отключить disabled, если хочешь разрешить выбор пустых месяцев
                                    className={`
                                        py-3 rounded-[16px] text-[13px] font-bold transition-all duration-200 border
                                        ${isSelected 
                                            ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-lg' 
                                            : hasData 
                                                ? 'bg-[#2C2C2E] border-transparent text-white hover:bg-[#3A3A3C]'
                                                : 'bg-[#1C1C1E] border-white/5 text-[#5F6067] hover:border-white/10'
                                        }
                                    `}
                                >
                                    {mName}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}