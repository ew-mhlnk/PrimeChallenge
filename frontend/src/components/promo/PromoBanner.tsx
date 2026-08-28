'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

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
        {/* Изображение US Open на весь баннер */}
        <Image
          src="/images/promo/us.png"
          alt="US Open"
          fill
          priority
          sizes="100vw"
          className="object-cover object-right pointer-events-none z-0"
        />
      </motion.div>
    </Link>
  );
};