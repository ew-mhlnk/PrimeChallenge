'use client';
import localFont from 'next/font/local';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Загружаем локальные шрифты
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
        className="w-full relative h-[105px] sm:h-[135px] rounded-[24px] overflow-hidden shadow-2xl group cursor-pointer border border-white/5 bg-cover bg-center flex flex-col items-center justify-center"
        style={{ 
          backgroundImage: "url('/images/promo/grass.PNG')" 
        }}
      >
        {/* Затемняющая подложка для читаемости текста на детальном фоне травы */}
        <div className="absolute inset-0 bg-black/30 transition-colors duration-300 group-hover:bg-black/40 z-10" />

        {/* Контент баннера */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 select-none">
          <span className={`${oswald.className} text-[22px] sm:text-[34px] text-white font-bold uppercase tracking-wide leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]`}>
            Травяной сезон
          </span>
          <span className={`${benzin.className} text-[10px] sm:text-[13px] text-[#CCFF00] font-bold tracking-widest uppercase mt-1.5 sm:mt-2.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]`}>
            в самом разгаре!
          </span>
        </div>

        {/* Эффект блика при наведении */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 z-30" />
      </motion.div>
    </Link>
  );
};