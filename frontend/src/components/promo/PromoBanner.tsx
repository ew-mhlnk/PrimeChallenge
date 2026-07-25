'use client';
import localFont from 'next/font/local';
import { motion } from 'framer-motion';
import Link from 'next/link';

const visby = localFont({
  src: '../../../public/fonts/VisbyCF.otf',
  display: 'swap',
});

export const PromoBanner = () => {
  return (
    <Link href="https://vk.com/tennisprimesport" target="_blank" rel="noopener noreferrer" className="block w-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="
          relative w-full overflow-hidden rounded-[24px] border border-white/5 shadow-2xl
          aspect-[16/9] sm:aspect-[21/9] max-h-[240px]
          bg-cover bg-center bg-no-repeat select-none cursor-pointer
        "
        style={{ backgroundImage: "url('/images/promo/гр.png')" }}
      >
        {/* затемнение для читаемости текста */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/50 via-black/20 to-black/60" />

        {/* статуя — прижата к низу по центру */}
        <img
          src="/images/promo/статуя.png"
          alt=""
          aria-hidden
          className="
            absolute bottom-0 left-1/2 -translate-x-1/2 z-20
            h-[85%] w-auto max-w-none object-contain object-bottom
            drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] pointer-events-none
          "
        />

        {/* текст поверх слоёв */}
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-4">
          <h2
            className={`
              ${visby.className} italic font-bold text-white uppercase leading-none
              text-[clamp(2rem,11vw,4.5rem)] tracking-tight
              drop-shadow-[0_3px_14px_rgba(0,0,0,0.7)]
            `}
          >
            US Open
          </h2>
          <p className="mt-2 text-[11px] sm:text-[14px] text-white/80 font-medium tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            Один из четырёх турниров Большого шлема
          </p>
          <span className="mt-1 text-[13px] sm:text-[16px] font-bold uppercase tracking-[0.25em] text-[#CCFF00] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            скоро...
          </span>
        </div>
      </motion.div>
    </Link>
  );
};