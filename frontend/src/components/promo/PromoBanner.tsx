'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export const PromoBanner = () => {
  return (
    <Link href="https://vk.com/tennisprimesport" target="_blank" rel="noopener noreferrer" className="block w-full">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        // Высота чуть меньше, так как нет картинок, но достаточная для акцента
        className="w-full relative h-[100px] sm:h-[120px] rounded-[24px] overflow-hidden shadow-2xl group cursor-pointer border border-white/5"
      >
        {/* 1. ЗАЛИВКА (Синий градиент) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A79FF] to-[#075CC2]" />

        {/* 2. ТЕКСТ (Центр) */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            <span className="font-visby text-[28px] sm:text-[36px] text-white tracking-widest font-black italic uppercase drop-shadow-md group-hover:scale-105 transition-transform duration-300">
                ПРИЗЫ ЗА УЧАСТИЕ
            </span>
        </div>
        
        {/* 3. Блик при наведении */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300 z-30" />

      </motion.div>
    </Link>
  );
};