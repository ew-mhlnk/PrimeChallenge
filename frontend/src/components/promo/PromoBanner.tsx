'use client';

import localFont from 'next/font/local';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const visby = localFont({
  src: '../../../public/fonts/VisbyCF.otf', // Укажите ваш путь к файлу шрифта
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
          relative w-full overflow-hidden rounded-[20px] sm:rounded-[24px] 
          h-[130px] sm:h-[170px] lg:h-[200px]
          border border-white/5 shadow-2xl select-none cursor-pointer
        "
      >
        {/* 1. Градиентный фон (гр.png) на всю ширину баннера */}
        <Image
          src="/images/promo/гр.png"
          alt="Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center z-0 pointer-events-none"
        />

        {/* 2. Статуя справа */}
        <div className="absolute right-0 bottom-0 h-full w-[45%] sm:w-[40%] z-10 pointer-events-none">
          <Image
            src="/images/promo/статуя.png"
            alt="Статуя"
            fill
            priority
            sizes="(max-width: 640px) 45vw, 40vw"
            className="object-contain object-right-bottom"
          />
        </div>

        {/* 3. Текст слева */}
        <div className="absolute inset-y-0 left-0 z-20 flex flex-col justify-center items-start pl-6 sm:pl-10 lg:pl-14 max-w-[60%]">
          <h2
            className={`
              ${visby.className} italic font-black text-white uppercase leading-none
              text-[clamp(1.8rem,5.5vw,3.5rem)] tracking-tight
              drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]
            `}
          >
            US OPEN
          </h2>
          <span
            className={`
              ${visby.className} italic font-medium text-white/90
              text-[clamp(1rem,2.8vw,1.8rem)] leading-none mt-1.5 sm:mt-2.5
              drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]
            `}
          >
            скоро...
          </span>
        </div>
      </motion.div>
    </Link>
  );
};