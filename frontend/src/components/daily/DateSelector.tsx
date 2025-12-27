'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- Импортируем Портал
import { motion, AnimatePresence } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// --- ИКОНКИ ---
const ChevronLeft = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18L9 12L15 6"/></svg>;
const ChevronRight = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18L15 12L9 6"/></svg>;
const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00B2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const CloseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

interface Props {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export const DateSelector = ({ selectedDate, onSelect }: Props) => {
  const { impact, selection } = useHapticFeedback();
  
  const [weekStart, setWeekStart] = useState<Date>(getMonday(selectedDate));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(new Date(selectedDate));
  const [mounted, setMounted] = useState(false); // Для портала

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setWeekStart(getMonday(selectedDate));
  }, [selectedDate]);

  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay(); 
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(date.setDate(diff));
  }

  const changeWeek = (direction: 'prev' | 'next') => {
    selection();
    const newStart = new Date(weekStart);
    newStart.setDate(weekStart.getDate() + (direction === 'next' ? 7 : -7));
    setWeekStart(newStart);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  const monthName = weekStart.toLocaleString('ru-RU', { month: 'long' });
  const yearName = weekStart.getFullYear();
  const title = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${yearName}`;

  return (
    <div className="flex flex-col gap-3 mb-6 w-full">
      
      {/* HEADER */}
      <div className="flex items-center justify-between px-2">
         <h3 className="text-[17px] font-bold text-white capitalize tracking-tight">
            {title}
         </h3>
         <button 
            onClick={() => { impact('light'); setPickerDate(selectedDate); setIsCalendarOpen(true); }}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-95 transition-transform"
         >
            <CalendarIcon />
         </button>
      </div>

      {/* ЛЕНТА */}
      <div className="flex items-center justify-between gap-1 w-full">
         <button onClick={() => changeWeek('prev')} className="w-8 h-10 flex flex-shrink-0 items-center justify-center text-[#8E8E93] hover:text-white active:scale-90 transition rounded-lg hover:bg-white/5">
            <ChevronLeft />
         </button>

         <div className="grid grid-cols-7 gap-1.5 flex-1">
            {weekDays.map((date, idx) => {
              const isActive = isSameDay(date, selectedDate);
              const dayOfWeek = date.toLocaleString('ru-RU', { weekday: 'short' }).toUpperCase().replace('.', '');
              const dayNumber = date.getDate();

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isActive) {
                      impact('light');
                      onSelect(date);
                    }
                  }}
                  className="relative group flex flex-col items-center w-full"
                >
                  <div 
                    className={`
                       relative w-full aspect-[35/55] min-w-[32px]
                       rounded-[13px] p-[1px] transition-all duration-300
                       ${isActive ? 'shadow-[0_0_15px_rgba(0,178,255,0.4)] scale-105 z-10' : 'hover:opacity-80'}
                    `}
                    style={{
                        background: isActive 
                            ? '#00B2FF' 
                            : 'linear-gradient(90deg, #212121 0%, #161616 100%)' 
                    }}
                  >
                      <div 
                        className="w-full h-full rounded-[12px] flex flex-col items-center justify-center gap-0.5"
                        style={{
                            background: isActive 
                                ? '#00B2FF' 
                                : 'linear-gradient(90deg, #1B1A1E 0%, #161616 100%)' 
                        }}
                      >
                            <span className={`text-[9px] font-bold leading-none ${isActive ? 'text-white' : 'text-[#616171]'}`}>
                                {dayOfWeek}
                            </span>
                            <span className={`text-[15px] font-bold leading-none ${isActive ? 'text-white' : 'text-white'}`}>
                                {dayNumber}
                            </span>
                      </div>
                  </div>
                </button>
              );
            })}
         </div>

         <button onClick={() => changeWeek('next')} className="w-8 h-10 flex flex-shrink-0 items-center justify-center text-[#8E8E93] hover:text-white active:scale-90 transition rounded-lg hover:bg-white/5">
            <ChevronRight />
         </button>
      </div>

      {/* МОДАЛКА ЧЕРЕЗ ПОРТАЛ (Чтобы быть поверх всего) */}
      <AnimatePresence>
        {isCalendarOpen && mounted && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                    onClick={() => setIsCalendarOpen(false)} 
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
                />
                
                {/* Modal */}
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                    animate={{ scale: 1, opacity: 1, y: 0 }} 
                    exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                    className="relative w-full max-w-[320px] bg-[#1C1C1E] border border-white/10 rounded-[32px] p-5 shadow-2xl overflow-hidden"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                             <button onClick={() => setPickerDate(new Date(pickerDate.setMonth(pickerDate.getMonth() - 1)))} className="p-2 hover:bg-white/5 rounded-full"><ChevronLeft /></button>
                             <span className="text-lg font-bold text-white capitalize">
                                {pickerDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                             </span>
                             <button onClick={() => setPickerDate(new Date(pickerDate.setMonth(pickerDate.getMonth() + 1)))} className="p-2 hover:bg-white/5 rounded-full"><ChevronRight /></button>
                        </div>
                        <button onClick={() => setIsCalendarOpen(false)} className="p-2 text-[#8E8E93] hover:text-white"><CloseIcon /></button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d => (
                            <span key={d} className="text-center text-[11px] text-[#616171] font-bold">{d}</span>
                        ))}
                        {getDaysInMonth(pickerDate).map((dateObj, i) => {
                            if (!dateObj) return <div key={`empty-${i}`} />;
                            const isSelected = isSameDay(dateObj, selectedDate);
                            const isToday = isSameDay(dateObj, new Date());
                            
                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        impact('medium');
                                        onSelect(dateObj);
                                        setIsCalendarOpen(false);
                                    }}
                                    className={`
                                        aspect-square rounded-full flex items-center justify-center text-sm font-bold transition-all
                                        ${isSelected ? 'bg-[#00B2FF] text-white shadow-lg' : 'text-white hover:bg-white/10'}
                                        ${isToday && !isSelected ? 'border border-[#00B2FF] text-[#00B2FF]' : ''}
                                    `}
                                >
                                    {dateObj.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button onClick={() => { impact('medium'); onSelect(new Date()); setIsCalendarOpen(false); }} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-[16px] text-sm font-bold text-[#00B2FF]">
                        Вернуться к Сегодня
                    </button>
                </motion.div>
            </div>,
            document.body
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Helpers ---
function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); 
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
}