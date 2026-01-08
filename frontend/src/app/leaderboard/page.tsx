'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import Image from 'next/image';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

export default function LeaderboardHub() {
  const router = useRouter();
  const { impact } = useHapticFeedback();

  const handleNav = (path: string) => {
      impact('light');
      router.push(path);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32">
      
      {/* 
         HEADER - Идентичен DailyPage
         Структура: relative контейнер, кнопка absolute left-0, заголовок по центру.
      */}
      <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-white/5">
            <div className="relative flex items-center justify-center min-h-[40px]">
                {/* Кнопка Назад (Абсолютно слева) */}
                <button 
                    onClick={() => { impact('light'); router.back(); }} 
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                >
                    <BackIcon />
                </button>
                
                {/* Заголовок (Строго по центру) */}
                <h1 className="text-[20px] font-bold text-white tracking-tight leading-none">
                    Лидерборды
                </h1>
            </div>
      </header>

      <main className="px-4 mt-6 flex flex-col gap-4">
          
          {/* ========================================== */}
          {/* КАРТОЧКА 1: ПО ТУРНИРАМ */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/tournaments')}
            className="relative w-full cursor-pointer"
          >
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-lg">
                
                {/* Градиент */}
                <div 
                    className="absolute right-[-20%] bottom-[-30%] w-[80%] h-[150%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(184, 134, 11, 0.5) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(30px)',
                    }}
                />

                <div className="absolute inset-0 bg-noise pointer-events-none opacity-30" />

                {/* Текст */}
                <div className="relative z-10 pl-8 flex flex-col justify-center h-full w-[50%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight relative z-20">
                        По турнирам
                    </span>
                </div>

                {/* КАРТИНКА (КУБОК) - Масштаб x1.45 */}
                <div className="absolute right-[-20px] bottom-[-40px] h-[180%] w-[60%] z-10 flex items-end justify-end pointer-events-none">
                    <div className="relative w-full h-full">
                        <Image 
                            src="/images/trophie_lb.png" 
                            alt="Trophy" 
                            fill
                            className="object-contain object-bottom scale-[1.45]"
                            quality={100}
                            priority
                        />
                    </div>
                </div>
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* КАРТОЧКА 2: ДЕЙЛИ ЧЕЛЛЕНДЖ */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/daily')}
            className="relative w-full cursor-pointer"
          >
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-lg">
                
                {/* Градиент */}
                <div 
                    className="absolute right-[-20%] bottom-[-30%] w-[80%] h-[150%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(9, 87, 108, 0.6) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(30px)',
                    }}
                />

                <div className="absolute inset-0 bg-noise pointer-events-none opacity-30" />

                {/* Текст */}
                <div className="relative z-10 pl-8 flex flex-col justify-center h-full w-[50%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight relative z-20">
                        Дейли<br />челлендж
                    </span>
                </div>

                {/* КАРТИНКА (РАКЕТКИ) - Масштаб x1.7 */}
                <div className="absolute right-[-30px] bottom-[-30px] h-[160%] w-[65%] z-10 pointer-events-none">
                    <Image 
                        src="/images/racket1.png" 
                        alt="Rackets" 
                        fill
                        className="object-contain object-bottom-right scale-[1.7]" 
                        quality={100}
                    /> 
                </div>

            </div>
          </motion.div>

      </main>
    </div>
  );
}