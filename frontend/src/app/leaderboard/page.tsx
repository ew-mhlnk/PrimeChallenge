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
      
      {/* HEADER (Идентичен Daily Challenge) */}
      <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-white/5">
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

      <main className="px-4 mt-6 flex flex-col gap-5">
          
          {/* ========================================== */}
          {/* КАРТОЧКА 1: ПО ТУРНИРАМ (КУБОК) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/tournaments')}
            className="relative w-full cursor-pointer group"
          >
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-2xl">
                
                {/* --- ФОН И ЭФФЕКТЫ --- */}
                {/* Золотой градиент справа-снизу */}
                <div 
                    className="absolute right-[-10%] bottom-[-40%] w-[90%] h-[160%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(184, 134, 11, 0.45) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(35px)',
                    }}
                />
                <div className="absolute inset-0 bg-noise pointer-events-none opacity-20" />
                <div className="animate-shine" />

                {/* --- ТЕКСТ (СЛЕВА) --- */}
                <div className="relative z-30 pl-8 flex flex-col justify-center h-full w-[55%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight drop-shadow-md">
                        По турнирам
                    </span>
                    <span className="text-[12px] text-[#8E8E93] font-medium mt-1 leading-snug pr-2">
                        Рейтинги всех прошедших и активных турниров
                    </span>
                </div>

                {/* --- КАРТИНКА (КУБОК) --- */}
                {/* 
                    w-[45%] - занимает 45% ширины справа.
                    h-[90%] - занимает 90% высоты (чтобы были отступы).
                    object-contain - сохраняет пропорции.
                    object-right-bottom - прижимается в угол.
                */}
                <div className="absolute right-0 bottom-0 w-[45%] h-[100%] z-20 flex items-end justify-end pointer-events-none pr-4 pb-2">
                    <div className="relative w-full h-[95%] animate-float"> 
                        <Image 
                            src="/images/кубок.png"  // Используем русское имя, если вы так сохранили, но лучше trophy.png
                            alt="Trophy" 
                            fill
                            className="object-contain object-right-bottom"
                            quality={100}
                            unoptimized={true}
                            priority
                        />
                    </div>
                </div>
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* КАРТОЧКА 2: ДЕЙЛИ ЧЕЛЛЕНДЖ (РАКЕТКА) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/daily')}
            className="relative w-full cursor-pointer group"
          >
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-2xl">
                
                {/* --- ФОН И ЭФФЕКТЫ --- */}
                {/* Синий/Тиловый градиент */}
                <div 
                    className="absolute right-[-10%] bottom-[-40%] w-[90%] h-[160%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(9, 87, 108, 0.5) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(35px)',
                    }}
                />
                <div className="absolute inset-0 bg-noise pointer-events-none opacity-20" />
                <div className="animate-shine" style={{ animationDelay: '1.5s' }} />

                {/* --- ТЕКСТ (СЛЕВА) --- */}
                <div className="relative z-30 pl-8 flex flex-col justify-center h-full w-[55%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight drop-shadow-md">
                        Дейли<br />челлендж
                    </span>
                    <span className="text-[12px] text-[#8E8E93] font-medium mt-1 leading-snug">
                        Ежедневный рейтинг прогнозистов
                    </span>
                </div>

                {/* --- КАРТИНКА (РАКЕТКА) --- */}
                <div className="absolute right-0 bottom-0 w-[50%] h-[100%] z-20 flex items-end justify-end pointer-events-none pr-0 pb-0">
                    {/* h-[110%] позволяет ракетке быть визуально чуть больше карточки, но overflow обрежет лишнее */}
                    <div className="relative w-full h-[110%] animate-float-delayed translate-y-2"> 
                        <Image 
                            src="/images/ракетка.png" // Используем русское имя, лучше racket.png
                            alt="Racket" 
                            fill
                            className="object-contain object-right-bottom"
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