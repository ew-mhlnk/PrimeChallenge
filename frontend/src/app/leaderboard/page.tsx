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
         HEADER - Идентичен Daily Challenge 
         pt-6, pb-2, px-6 - те же отступы.
         text-[20px] font-bold - тот же шрифт.
      */}
      <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-2 px-6 border-b border-white/5">
            <div className="relative flex items-center justify-center mb-0">
                <button 
                    onClick={() => { impact('light'); router.back(); }} 
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                >
                    <BackIcon />
                </button>
                <h1 className="text-[20px] font-bold text-white tracking-tight">
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
            {/* Карточка */}
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-lg">
                
                {/* Градиент (Золотой) */}
                <div 
                    className="absolute right-[-20%] bottom-[-30%] w-[80%] h-[150%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(184, 134, 11, 0.5) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(30px)',
                    }}
                />

                {/* Шум */}
                <div className="absolute inset-0 bg-noise pointer-events-none opacity-30" />

                {/* Текст */}
                <div className="relative z-10 pl-8 flex flex-col justify-center h-full w-[55%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight">
                        По турнирам
                    </span>
                </div>

                {/* КАРТИНКА (КУБОК) */}
                {/* Трюк: h-[140%] делает контейнер выше карточки, scale-110 увеличивает саму картинку */}
                <div className="absolute right-[-10px] bottom-[-20px] h-[140%] w-[50%] z-20 flex items-end justify-end pointer-events-none">
                    <div className="relative w-full h-full">
                        <Image 
                            src="/images/trophie_lb.png" 
                            alt="Trophy" 
                            fill
                            className="object-contain object-bottom scale-110"
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
            {/* Карточка */}
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-lg">
                
                {/* Градиент (Тиловый) */}
                <div 
                    className="absolute right-[-20%] bottom-[-30%] w-[80%] h-[150%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(9, 87, 108, 0.6) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(30px)',
                    }}
                />

                {/* Шум */}
                <div className="absolute inset-0 bg-noise pointer-events-none opacity-30" />

                {/* Текст */}
                <div className="relative z-10 pl-8 flex flex-col justify-center h-full w-[55%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight">
                        Дейли<br />челлендж
                    </span>
                </div>

                {/* КАРТИНКА (РАКЕТКИ) */}
                {/* Делаем их огромными, наезжающими на край */}
                <div className="absolute right-[-20px] bottom-[-20px] h-[130%] w-[55%] z-20 pointer-events-none">
                    
                    {/* Вариант 1: Если у вас две ракетки в одном файле racket1.png */}
                    <Image 
                        src="/images/racket1.png" 
                        alt="Rackets" 
                        fill
                        className="object-contain object-bottom-right scale-125" 
                        quality={100}
                    /> 

                    {/* Вариант 2: Если нужно собрать из двух (раскомментируйте, если надо) */}
                    {/*
                    <div className="relative w-full h-full scale-125 origin-bottom-right">
                        <div className="absolute right-[20px] bottom-[10px] w-[80%] h-[80%] opacity-50 blur-[1px]">
                             <Image src="/images/racket2.png" alt="Back" fill className="object-contain" />
                        </div>
                        <div className="absolute right-0 bottom-0 w-[90%] h-[90%]">
                             <Image src="/images/racket1.png" alt="Front" fill className="object-contain" />
                        </div>
                    </div>
                    */}
                </div>

            </div>
          </motion.div>

      </main>
    </div>
  );
}