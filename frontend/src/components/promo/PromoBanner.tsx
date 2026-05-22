'use client';
import localFont from 'next/font/local';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Загружаем локальные шрифты из папки public/fonts
const benzin = localFont({
  src: '../../../public/fonts/BenzinMedium.ttf',
  display: 'swap',
});

const oswald = localFont({
  src: '../../../public/fonts/OswaldSemiBold.ttf',
  display: 'swap',
});

export const PromoBanner = () => {
  return (
    <Link href="https://vk.com/tennisprimesport" target="_blank" rel="noopener noreferrer" className="block w-full">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full relative h-[125px] sm:h-[160px] rounded-[24px] overflow-hidden shadow-2xl group cursor-pointer border border-white/5 bg-cover bg-center flex flex-col items-center justify-between py-3"
        style={{ 
          backgroundImage: "url('/images/promo/rglayer.png')" 
        }}
      >
        {/* 1. ЛОГОТИП (Сверху по центру, свисает вниз от верхнего края) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30">
          <img 
            src="/images/promo/RG.png" 
            alt="Roland Garros Logo" 
            className="h-[45px] sm:h-[60px] w-auto object-contain"
          />
        </div>

        {/* 2. ТЕКСТ: РОЛАН [место под логотип] ГАРРОС */}
        {/* mt-2 / mt-3 помогают выровнять текст по вертикальной оси симметрии логотипа */}
        <div className="flex items-center justify-between w-full max-w-[300px] sm:max-w-[400px] mt-[10px] sm:mt-[15px] z-20">
          <span className={`${benzin.className} text-[10px] sm:text-[14px] text-white tracking-widest font-medium text-right flex-1 pr-6 sm:pr-8`}>
            РОЛАН
          </span>
          
          {/* Пустой блок, резервирующий место под свисающий сверху логотип */}
          <div className="w-[45px] sm:w-[60px] flex-shrink-0" />
          
          <span className={`${benzin.className} text-[10px] sm:text-[14px] text-white tracking-widest font-medium text-left flex-1 pl-6 sm:pl-8`}>
            ГАРРОС
          </span>
        </div>

        {/* 3. ОСНОВНОЙ ТЕКСТ: НА ПРАЙМСПОРТ */}
        {/* tracking-[-0.05em] задает межбуквенный интервал -5% */}
        <div className="z-20 mb-1 sm:mb-2 flex items-center justify-center">
          <span className={`${oswald.className} text-[36px] sm:text-[52px] md:text-[60px] text-white font-bold uppercase tracking-[-0.05em] leading-none text-center`}>
            НА ПРАЙМСПОРТ
          </span>
        </div>

        {/* 4. Легкий блик/затемнение при наведении */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 z-10" />
      </motion.div>
    </Link>
  );
};