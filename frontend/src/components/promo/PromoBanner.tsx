'use client';

import localFont from 'next/font/local';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const visby = localFont({
  src: '../../../public/fonts/VisbyCF.otf', // Проверьте правильность пути к шрифту
  display: 'swap',
});

export const PromoBanner = () => {
  return (
    <Link 
      href="https://vk.com/tennisprimesport" 
      target="_blank" 
      rel="noopener noreferrer" 
      className="block w-full focus:outline-none"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="
          relative w-full overflow-hidden rounded-[24px] border border-white/5 shadow-2xl
          h-[140px] sm:h-[180px] lg:h-[200px]
          select-none cursor-pointer
        "
      >
        {/* Фоновое изображение (оптимизированное через Next.js Image) */}
        <Image
          src="/images/promo/гр.png"
          alt="Promo Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center pointer-events-none z-0"
        />

        {/* Затемнение фона для читаемости текста */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />

        {/* Статуя — позиционируется по центру снизу, масштабируясь по высоте баннера */}
        <div className="absolute inset-x-0 bottom-0 h-full z-20 pointer-events-none">
          <Image
            src="/images/promo/статуя.png"
            alt="Статуя"
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain object-bottom drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          />
        </div>

        {/* Контентный слой (текст) */}
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-4">
          <h2
            className={`
              ${visby.className} italic font-bold text-white uppercase leading-none
              text-[clamp(1.8rem,9vw,3.5rem)] tracking-tight
              drop-shadow-[0_3px_14px_rgba(0,0,0,0.7)]
            `}
          >
            US Open
          </h2>
          <p className="mt-1.5 text-[11px] sm:text-[13px] text-white/80 font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            Один из четырёх турниров Большого шлема
          </p>
          <span className="mt-1 text-[12px] sm:text-[15px] font-bold uppercase tracking-[0.25em] text-[#CCFF00] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            скоро...
          </span>
        </div>
      </motion.div>
    </Link>
  );
};