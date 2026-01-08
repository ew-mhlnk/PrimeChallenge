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
      
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-4 px-6">
            <div className="relative flex items-center justify-center min-h-[40px]">
                <button 
                    onClick={() => { impact('light'); router.back(); }} 
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                >
                    <BackIcon />
                </button>
                <h1 className="text-[20px] font-bold text-white tracking-tight leading-none">
                    Лидерборды
                </h1>
            </div>
      </header>

      <main className="px-4 mt-6 flex flex-col gap-4">
          
          {/* ========================================== */}
          {/* КАРТОЧКА 1: ПО ТУРНИРАМ (КУБОК) */}
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
                <div className="relative z-30 pl-8 flex flex-col justify-center h-full w-[50%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight drop-shadow-md">
                        По турнирам
                    </span>
                </div>

                {/* 
                   КУБОК (3.png)
                   Мы увеличили сам контейнер (w-48 h-48 вместо w-32), 
                   чтобы не использовать scale и не терять качество.
                */}
                <div className="absolute bottom-[-10px] right-[10px] w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] z-20 flex items-end justify-center pointer-events-none">
                    <div className="relative w-full h-full">
                        <Image 
                            src="/images/3.png" 
                            alt="Trophy" 
                            fill
                            className="object-contain object-bottom" // УБРАН SCALE
                            quality={100}
                            unoptimized={true} // Важно для четкости PNG
                            priority
                        />
                    </div>
                </div>
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* КАРТОЧКА 2: ДЕЙЛИ ЧЕЛЛЕНДЖ (РАКЕТКИ) */}
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
                <div className="relative z-30 pl-8 flex flex-col justify-center h-full w-[50%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight drop-shadow-md">
                        Дейли<br />челлендж
                    </span>
                </div>

                {/* 
                   РАКЕТКА 2 (Задняя - 2.png) 
                   right-[111px] сохранено. 
                   Размер контейнера увеличен, чтобы картинка была большой без зума.
                */}
                <div className="absolute bottom-[-20px] right-[111px] w-[140px] h-[160px] sm:w-[160px] sm:h-[180px] z-10 pointer-events-none">
                    <div className="relative w-full h-full opacity-60 blur-[0.5px]">
                        <Image 
                            src="/images/2.png" 
                            alt="Racket 2" 
                            fill
                            className="object-contain object-bottom" // УБРАН SCALE
                            quality={100}
                            unoptimized={true}
                        />
                    </div>
                </div>

                {/* 
                   РАКЕТКА 1 (Передняя - 1.png)
                   right-[30px] сохранено.
                   Размер контейнера больше, чем у задней.
                */}
                <div className="absolute bottom-[-20px] right-[20px] w-[160px] h-[180px] sm:w-[190px] sm:h-[210px] z-20 pointer-events-none">
                    <div className="relative w-full h-full">
                        <Image 
                            src="/images/1.png" 
                            alt="Racket 1" 
                            fill
                            className="object-contain object-bottom" // УБРАН SCALE
                            quality={100}
                            unoptimized={true}
                        /> 
                    </div>
                </div>

            </div>
          </motion.div>

      </main>
    </div>
  );
}