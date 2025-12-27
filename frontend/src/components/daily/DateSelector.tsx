'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface Props {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export const DateSelector = ({ selectedDate, onSelect }: Props) => {
  const { selection } = useHapticFeedback();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Генерируем дни (например, 2 недели: неделю назад и неделю вперед)
  const days = [];
  for (let i = -7; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  // Скролл к выбранной дате при загрузке
  useEffect(() => {
    if (scrollRef.current) {
      // Находим активный элемент (простая логика центрирования)
      const centerIndex = 7; // "Сегодня" находится в середине массива
      const itemWidth = 45; // Ширина элемента + отступ
      scrollRef.current.scrollLeft = (centerIndex * itemWidth) - (window.innerWidth / 2) + (itemWidth / 2);
    }
  }, []);

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();

  // Форматирование месяца и года для заголовка
  const monthName = selectedDate.toLocaleString('ru-RU', { month: 'long' });
  const year = selectedDate.getFullYear();
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="flex flex-col gap-4 mb-6">
      
      {/* Месяц и Год + Иконка календаря */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[15px] font-medium text-white capitalize">
          {capitalizedMonth} <span className="text-[#616171]">{year}</span>
        </h3>
        {/* Иконка календаря (визуальная) */}
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-95 transition-transform">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00B2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
        </button>
      </div>

      {/* Лента дней */}
      <div 
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x"
      >
        {days.map((date, idx) => {
          const isActive = isSameDay(date, selectedDate);
          const dayOfWeek = date.toLocaleString('ru-RU', { weekday: 'short' }).toUpperCase().replace('.', '');
          const dayNumber = date.getDate();

          return (
            <button
              key={idx}
              onClick={() => {
                if (!isActive) {
                  selection();
                  onSelect(date);
                }
              }}
              className="relative group snap-center"
            >
              {/* КОНТЕЙНЕР (Воссоздаем дизайн Figma) */}
              <motion.div
                layout
                initial={false}
                animate={{
                  backgroundColor: isActive ? '#00B2FF' : 'transparent',
                }}
                className={`
                   w-[35px] h-[55px] rounded-[13px] 
                   flex flex-col items-center justify-center gap-1
                   transition-all duration-300 relative overflow-hidden
                `}
                style={{
                   // Если не активен, задаем градиент как в Figma
                   background: isActive 
                     ? '#00B2FF' 
                     : 'linear-gradient(180deg, #1B1A1E 0%, #161616 100%)'
                }}
              >
                {/* Бордер (через абсолютный div, чтобы повторить градиент прозрачности) */}
                {!isActive && (
                    <div className="absolute inset-0 rounded-[13px] border border-white/10 pointer-events-none" />
                )}
                
                {/* Текст */}
                <span className={`text-[9px] font-bold leading-none ${isActive ? 'text-white' : 'text-[#616171]'}`}>
                    {dayOfWeek}
                </span>
                <span className={`text-[15px] font-bold leading-none ${isActive ? 'text-white' : 'text-white'}`}>
                    {dayNumber}
                </span>

                {/* Блик сверху (как в Figma stroke gradient) */}
                {!isActive && (
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                )}
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
};