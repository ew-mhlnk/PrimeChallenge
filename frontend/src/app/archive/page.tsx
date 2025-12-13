'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import useTournaments from '../../hooks/useTournaments';
// УДАЛИЛИ: import { Tournament } from '@/types'; — так как он не использовался явно
import { TournamentListItem } from '@/components/tournament/TournamentListItem';

// --- ИКОНКИ ---
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ChevronLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>;
const ChevronRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>;
const CloseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

// --- ХЕЛПЕРЫ ---
const getMonthName = (index: number) => {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[index];
};

const formatMonthHeader = (monthStr?: string) => {
    if (!monthStr) return 'Все время';
    if (!monthStr.includes('.')) return monthStr;
    const [m, y] = monthStr.split('.');
    return `${getMonthName(parseInt(m) - 1)} ${y}`;
};

// --- КОМПОНЕНТ ФИЛЬТРА (TAG) ---
const FilterPill = ({ label, isActive, onClick, colorClass }: { label: string, isActive: boolean, onClick: () => void, colorClass: string }) => (
    <button
      onClick={onClick}
      className={`
        relative px-5 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all duration-300 flex-shrink-0
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const filters = [
    { label: 'ВСЕ', color: 'bg-[#007AFF]' },
    { label: 'ATP', color: 'bg-[#002BFF]' },
    { label: 'WTA', color: 'bg-[#7B00FF]' },
    { label: 'ТБШ', color: 'bg-gradient-to-r from-[#FDF765] to-[#DAB07F]' },
  ];

  // 1. Инициализация месяца (текущий)
  useEffect(() => {
      if (!selectedMonth) {
          const now = new Date();
          const currentMonthStr = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
          setSelectedMonth(currentMonthStr);
          setPickerYear(now.getFullYear());
      }
  }, [selectedMonth]);

  // 2. Фильтрация
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

  // Обработчик выбора месяца в модалке
  const handleMonthSelect = (monthIndex: number) => {
      const mStr = String(monthIndex + 1).padStart(2, '0');
      const fullStr = `${mStr}.${pickerYear}`;
      setSelectedMonth(fullStr);
      setIsPickerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32 relative">
      
      {/* --- HEADER --- */}
      <header className="px-6 pt-8 pb-2 flex items-center justify-between bg-[#141414] sticky top-0 z-20">
        <div className="flex items-center gap-4">
            <button 
            onClick={() => router.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
            >
            <BackIcon />
            </button>
            <h1 className="text-[28px] font-bold text-white tracking-tight">Календарь</h1>
        </div>

        {/* Кнопка открытия календаря */}
        <button 
            onClick={() => setIsPickerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E]/80 border border-white/10 backdrop-blur-md active:scale-90 transition-transform"
        >
            <CalendarIcon />
        </button>
      </header>

      {/* --- ФИЛЬТРЫ (TAGS) --- */}
      <div className="sticky top-[72px] z-20 bg-[#141414] pb-4 pt-2 border-b border-white/5">
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
        
        {/* Заголовок текущего месяца */}
        <motion.h2 
            key={selectedMonth}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[20px] font-bold text-white ml-2 mb-2"
        >
            {formatMonthHeader(selectedMonth || '')}
        </motion.h2>

        {isLoading ? (
            <p className="text-[#5F6067] text-center mt-10">Загрузка...</p>
        ) : error ? (
            <p className="text-red-500 text-center mt-10">Ошибка: {error}</p>
        ) : filteredList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 gap-2">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                </div>
                <p>Нет турниров</p>
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

      {/* --- МОДАЛКА ВЫБОРА МЕСЯЦА (DatePicker) --- */}
      <AnimatePresence>
        {isPickerOpen && (
            <>
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsPickerOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                />
                
                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[340px] bg-[#1C1C1E] border border-white/10 rounded-[32px] p-5 z-50 shadow-2xl overflow-hidden"
                >
                    {/* Header: Год и Закрыть */}
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Турниры</h3>
                        <div className="flex items-center gap-4">
                            {/* Выбор года */}
                            <div className="flex items-center gap-2 bg-black/30 rounded-full px-3 py-1">
                                <button onClick={() => setPickerYear(p => p - 1)} className="p-1 text-[#8E8E93] hover:text-white"><ChevronLeft /></button>
                                <span className="font-bold font-mono text-lg">{pickerYear}</span>
                                <button onClick={() => setPickerYear(p => p + 1)} className="p-1 text-[#8E8E93] hover:text-white"><ChevronRight /></button>
                            </div>
                            <button onClick={() => setIsPickerOpen(false)} className="p-1 text-[#8E8E93] hover:text-white">
                                <CloseIcon />
                            </button>
                        </div>
                    </div>

                    {/* Сетка месяцев */}
                    <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 12 }).map((_, idx) => {
                            const isCurrent = selectedMonth === `${String(idx + 1).padStart(2, '0')}.${pickerYear}`;
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleMonthSelect(idx)}
                                    className={`
                                        py-3 rounded-[16px] text-[14px] font-medium transition-all duration-200 border
                                        ${isCurrent 
                                            ? 'bg-[#007AFF]/20 border-[#007AFF] text-[#007AFF] shadow-[0_0_15px_rgba(0,122,255,0.3)]' 
                                            : 'bg-[#2C2C2E] border-transparent text-[#8E8E93] hover:bg-[#3A3A3C] hover:text-white'
                                        }
                                    `}
                                >
                                    {getMonthName(idx)}
                                </button>
                            );
                        })}
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>

    </div>
  );
}