'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import Image from 'next/image';

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>);

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
      <header className="px-6 pt-8 pb-4 flex items-center justify-between relative z-20">
        <button 
          onClick={() => { impact('light'); router.back(); }} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
        >
          <BackIcon />
        </button>
        
        <h1 className="absolute left-0 right-0 text-center text-[20px] font-bold text-white pointer-events-none">
            Лидерборды
        </h1>
        <div className="w-10" /> 
      </header>

      <main className="px-4 mt-4 flex flex-col gap-5">
          
          {/* ========================================== */}
          {/* КАРТОЧКА 1: ПО ТУРНИРАМ */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/tournaments')}
            className="relative w-full cursor-pointer group"
          >
            {/* Градиентная обводка (Container) */}
            <div className="rounded-[24px] p-[1px] bg-gradient-to-b from-[#212121] to-[#161616]">
                
                {/* Внутренний контент (Background) */}
                <div className="relative h-[144px] w-full rounded-[23px] bg-gradient-to-b from-[#1B1A1E] to-[#161616] overflow-hidden flex items-center">
                    
                    {/* 1. Правый нижний градиент (Radial) */}
                    <div 
                        className="absolute bottom-0 right-0 w-[80%] h-[120%] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse 85% 120% at 100% 100%, #09576C 0%, rgba(26, 25, 28, 0) 100%)',
                            opacity: 0.8
                        }}
                    />

                    {/* 2. Шум (Noise) */}
                    <div className="absolute inset-0 bg-noise pointer-events-none" />

                    {/* 3. Shine Animation */}
                    <div className="animate-shine" />

                    {/* 4. Контент (Текст слева) */}
                    <div className="relative z-10 pl-6 pr-24 flex flex-col justify-center h-full max-w-[65%]">
                        <h2 className="text-[22px] font-bold text-white leading-tight mb-1">
                            По Турнирам
                        </h2>
                        <p className="text-[#8E8E93] text-[12px] font-medium leading-snug">
                            Рейтинги всех прошедших и активных турниров
                        </p>
                    </div>

                    {/* 5. Картинка (Trophy) - Floating */}
                    <div className="absolute right-[-10px] bottom-[-10px] w-[140px] h-[140px] z-20 animate-float">
                        {/* Замените src на путь к вашей картинке */}
                        {/* Если файла нет, покажет заглушку, но не сломает верстку */}
                        <Image 
                            src="/images/trophie_lb.png" 
                            alt="Trophy" 
                            width={160} 
                            height={160}
                            className="object-contain drop-shadow-2xl"
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
            className="relative w-full cursor-pointer group"
          >
            {/* Градиентная обводка */}
            <div className="rounded-[24px] p-[1px] bg-gradient-to-b from-[#212121] to-[#161616]">
                
                {/* Внутренний фон */}
                <div className="relative h-[144px] w-full rounded-[23px] bg-gradient-to-b from-[#1B1A1E] to-[#161616] overflow-hidden flex items-center">
                    
                    {/* 1. Правый нижний градиент (Radial) */}
                    <div 
                        className="absolute bottom-0 right-0 w-[80%] h-[120%] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse 85% 120% at 100% 100%, #09576C 0%, rgba(26, 25, 28, 0) 100%)',
                            opacity: 0.8
                        }}
                    />

                    {/* 2. Шум */}
                    <div className="absolute inset-0 bg-noise pointer-events-none" />

                    {/* 3. Shine Animation */}
                    <div className="animate-shine" style={{ animationDelay: '1.5s' }} />

                    {/* 4. Контент (Текст) */}
                    <div className="relative z-10 pl-6 pr-20 flex flex-col justify-center h-full max-w-[65%]">
                        <h2 className="text-[22px] font-bold text-white leading-tight mb-1">
                            Дейли Челлендж
                        </h2>
                        <p className="text-[#8E8E93] text-[12px] font-medium leading-snug">
                            Ежедневный рейтинг прогнозистов
                        </p>
                    </div>

                    {/* 5. Картинки (Rackets) - Floating Desync */}
                    <div className="absolute right-0 bottom-0 w-[140px] h-[140px] z-20">
                        {/* Ракетка 1 (На заднем плане, чуть меньше) */}
                        <div className="absolute right-[20px] bottom-[10px] w-[90px] h-[90px] animate-float-delayed opacity-80 rotate-[-15deg] blur-[0.5px]">
                            <Image 
                                src="/images/racket2.png" 
                                alt="Racket Back" 
                                width={100} 
                                height={100}
                                className="object-contain"
                            />
                        </div>
                        
                        {/* Ракетка 2 (На переднем плане) */}
                        <div className="absolute right-[-10px] bottom-[-10px] w-[110px] h-[110px] animate-float z-30">
                            <Image 
                                src="/images/racket1.png" 
                                alt="Racket Front" 
                                width={120} 
                                height={120}
                                className="object-contain drop-shadow-2xl"
                            />
                        </div>
                    </div>

                </div>
            </div>
          </motion.div>

      </main>
    </div>
  );
}