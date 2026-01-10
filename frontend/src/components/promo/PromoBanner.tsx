'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';

export const PromoBanner = () => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  // --- ЛОГИКА ТАЙМЕРА ---
  useEffect(() => {
    const targetDate = new Date('2026-01-18T00:00:00');

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('LIVE');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      const getDeclension = (n: number, titles: string[]) => {
        return titles[(n % 10 === 1 && n % 100 !== 11) ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];
      }

      if (days > 0) {
         const label = getDeclension(days, ['ДЕНЬ', 'ДНЯ', 'ДНЕЙ']);
         setTimeLeft(`${days} ${label}`);
      } else {
         const label = getDeclension(hours, ['ЧАС', 'ЧАСА', 'ЧАСОВ']);
         setTimeLeft(`${hours} ${label}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="https://vk.com/tennisprimesport" target="_blank" rel="noopener noreferrer" className="block w-full">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        // Уменьшил высоту: h-[160px] (было 180), sm:h-[195px] (было 220)
        className="w-full relative h-[160px] sm:h-[195px] rounded-[24px] overflow-hidden shadow-2xl group cursor-pointer border border-white/5"
      >
        {/* 1. ЗАЛИВКА */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A79FF] to-[#075CC2]" />

        {/* 2. ПАТТЕРН */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
          <Image 
              src="/images/promo/Pattern.png" 
              alt="Pattern" 
              fill 
              className="object-cover"
          />
        </div>

        {/* 3. ЛЕВАЯ КАРТИНКА */}
        <div className="absolute left-0 bottom-0 h-full w-[40%] z-10">
           <Image 
              src="/images/promo/left.png" 
              alt="Left Player" 
              fill 
              className="object-contain object-left-bottom"
              priority
           />
        </div>

        {/* 4. ПРАВАЯ КАРТИНКА */}
        <div className="absolute right-0 bottom-0 h-full w-[40%] z-10">
           <Image 
              src="/images/promo/right.png" 
              alt="Right Player" 
              fill 
              className="object-contain object-right-bottom"
              priority
           />
        </div>

        {/* 5. ТЕКСТОВЫЙ БЛОК (Центр) */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pt-1">
            
            {/* ЗАГОЛОВОК */}
            <div className="flex flex-col items-center leading-[0.85] drop-shadow-lg">
                <span className="font-cyber text-[36px] sm:text-[48px] text-[#DCFD48] tracking-wide">
                    AUSTRALIAN
                </span>
                <span className="font-cyber text-[36px] sm:text-[48px] text-[#DCFD48] tracking-wide">
                    OPEN
                </span>
            </div>

            {/* ТАЙМЕР */}
            {/* mt-4 (было 3) - чуть ниже опустил */}
            <div className="mt-4 bg-black/20 backdrop-blur-md px-5 py-1.5 rounded-full border border-[#DCFD48]/20">
                <span className="font-visby text-[16px] sm:text-[20px] text-[#DCFD48] tracking-wider italic font-black uppercase">
                    {timeLeft || '...'}
                </span>
            </div>

        </div>
        
        {/* Блик при наведении */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 z-30" />

      </motion.div>
    </Link>
  );
};