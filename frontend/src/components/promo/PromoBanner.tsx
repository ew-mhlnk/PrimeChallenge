'use client';

import localFont from 'next/font/local';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const visby = localFont({
  src: '../../../public/fonts/VisbyCF.otf', // Проверьте путь к вашему шрифту
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
          h-[130px] sm:h-[160px] lg:h-[200px]
          border border-white/5 shadow-2xl select-none cursor-pointer
        "
      >
        {/* Изображение статуи растягивается на весь баннер, приоритет на правую сторону */}
        <Image
          src="/images/promo/статуя.png"
          alt="US Open"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right pointer-events-none z-0"
        />

        {/* Легкое затемнение слева для уверенной читаемости белого текста */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        {/* Текст слева поверх фона */}
        <div className="absolute inset-y-0 left-0 z-20 flex flex-col justify-center items-start pl-6 sm:pl-10 lg:pl-14">
          <h2
            className={`
              ${visby.className} italic font-black text-white uppercase leading-none
              text-[clamp(1.8rem,5.2vw,3.2rem)] tracking-tight
            `}
          >
            US OPEN
          </h2>
          <span
            className={`
              ${visby.className} italic font-medium text-white/90 leading-none mt-2
              text-[clamp(1rem,2.4vw,1.6rem)]
            `}
          >
            скоро...
          </span>
        </div>
      </motion.div>
    </Link>
  );
};