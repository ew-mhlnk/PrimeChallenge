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
          {/* КАРТОЧКА 1: ПО ТУРНИРАМ (ЗОЛОТОЙ ГРАДИЕНТ) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/tournaments')}
            className="relative w-full cursor-pointer group"
          >
            {/* Обводка */}
            <div className="rounded-[24px] p-[1px] bg-gradient-to-b from-[#212121] to-[#161616]">
                
                {/* Фон карточки */}
                <div className="relative h-[144px] w-full rounded-[23px] bg-[#1B1A1E] overflow-hidden flex items-center">
                    
                    {/* 1. ГРАДИЕНТ (Gold/Brown #6C4D09) */}
                    <div 
                        className="absolute bottom-0 right-0 w-[80%] h-[120%] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse 85.22% 117.16% at 100.00% 100.00%, #6C4D09 0%, rgba(26, 25, 28, 0) 100%)',
                            opacity: 0.8
                        }}
                    />

                    {/* 2. Шум */}
                    <div className="absolute inset-0 bg-noise pointer-events-none opacity-40" />

                    {/* 3. Shine Animation */}
                    <div className="animate-shine" />

                    {/* 4. Контент (Текст) */}
                    <div className="relative z-10 pl-6 flex flex-col justify-center h-full w-[55%]">
                        <h2 className="text-[22px] font-bold text-white leading-tight mb-2 whitespace-nowrap">
                            По Турнирам
                        </h2>
                        {/* Ограничиваем ширину, чтобы переносилось в 2 строки */}
                        <p className="text-[#8E8E93] text-[12px] font-medium leading-[1.3] line-clamp-2">
                            Рейтинги всех прошедших и активных турниров
                        </p>
                    </div>

                    {/* 5. Картинка (Trophy) */}
                    <div className="absolute right-[-20px] bottom-[-20px] z-20 animate-float">
                        <Image 
                            src="/images/trophie_lb.png" 
                            alt="Trophy" 
                            width={238} 
                            height={162}
                            className="object-contain drop-shadow-2xl"
                            // Scale down немного через CSS, чтобы влезало в 144px высоты, но сохраняло пропорции
                            style={{ height: '140px', width: 'auto' }}
                            priority
                        />
                    </div>
                </div>
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* КАРТОЧКА 2: ДЕЙЛИ ЧЕЛЛЕНДЖ (BLUE/TEAL ГРАДИЕНТ) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/daily')}
            className="relative w-full cursor-pointer group"
          >
            {/* Обводка */}
            <div className="rounded-[24px] p-[1px] bg-gradient-to-b from-[#212121] to-[#161616]">
                
                {/* Фон */}
                <div className="relative h-[144px] w-full rounded-[23px] bg-[#1B1A1E] overflow-hidden flex items-center">
                    
                    {/* 1. ГРАДИЕНТ (Teal #09576C) */}
                    <div 
                        className="absolute bottom-0 right-0 w-[80%] h-[120%] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse 85.22% 117.16% at 100.00% 100.00%, #09576C 0%, rgba(26, 25, 28, 0) 100%)',
                            opacity: 0.8
                        }}
                    />

                    {/* 2. Шум */}
                    <div className="absolute inset-0 bg-noise pointer-events-none opacity-40" />

                    {/* 3. Shine Animation (с задержкой) */}
                    <div className="animate-shine" style={{ animationDelay: '1.5s' }} />

                    {/* 4. Контент (Текст) */}
                    <div className="relative z-10 pl-6 flex flex-col justify-center h-full w-[55%]">
                        <h2 className="text-[22px] font-bold text-white leading-tight mb-2 whitespace-nowrap">
                            Дейли Челлендж
                        </h2>
                        <p className="text-[#8E8E93] text-[12px] font-medium leading-tight">
                            Ежедневный рейтинг прогнозистов
                        </p>
                    </div>

                    {/* 5. Картинки (Ракетки) */}
                    <div className="absolute right-0 bottom-0 h-full w-[160px] z-20">
                        
                        {/* Ракетка 2 (Задняя) 242x144 */}
                        <div className="absolute right-[10px] bottom-[-20px] animate-float-delayed z-20">
                            <Image 
                                src="/images/racket2.png" 
                                alt="Racket Back" 
                                width={242} 
                                height={144}
                                className="object-contain opacity-60 blur-[1px]"
                                style={{ height: '110px', width: 'auto', transform: 'rotate(-10deg)' }}
                            />
                        </div>
                        
                        {/* Ракетка 1 (Передняя) 268x188 */}
                        <div className="absolute right-[-30px] bottom-[-30px] animate-float z-30">
                            <Image 
                                src="/images/racket1.png" 
                                alt="Racket Front" 
                                width={268} 
                                height={188}
                                className="object-contain drop-shadow-2xl"
                                style={{ height: '150px', width: 'auto' }}
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