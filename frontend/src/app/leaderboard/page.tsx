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
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none">
            <h1 className="text-[17px] font-semibold text-[#8E8E93]">Лидерборды</h1>
        </div>
        
        {/* Кнопка назад (слева) */}
        {/* Если она нужна на макете - раскомментируйте. На скрине её не видно, но логически она нужна. */}
        {/* 
        <button 
          onClick={() => { impact('light'); router.back(); }} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform z-10"
        >
          <BackIcon />
        </button> 
        */}
        <div className="w-10" /> 
      </header>

      <main className="px-4 mt-2 flex flex-col gap-4">
          
          {/* ========================================== */}
          {/* КАРТОЧКА 1: ПО ТУРНИРАМ (ЗОЛОТАЯ) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/tournaments')}
            className="relative w-full cursor-pointer group"
          >
            {/* Контейнер карточки */}
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-lg">
                
                {/* 1. Градиент (Золотой) - Справа */}
                <div 
                    className="absolute right-[-20%] bottom-[-20%] w-[70%] h-[140%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(184, 134, 11, 0.4) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(20px)',
                    }}
                />

                {/* 2. Шум */}
                <div className="absolute inset-0 bg-noise pointer-events-none opacity-20" />

                {/* 3. Текст (Слева) */}
                <div className="relative z-10 pl-8 flex flex-col justify-center h-full w-[50%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight">
                        По турнирам
                    </span>
                </div>

                {/* 4. Картинка (Кубок) */}
                {/* Позиционируем абсолютно справа. Размеры подобраны под макет. */}
                <div className="absolute right-0 bottom-0 h-full w-[50%] z-20 flex items-end justify-end">
                    <div className="relative w-[160px] h-[150px] mr-4 mb-2">
                        <Image 
                            src="/images/trophie_lb.png" 
                            alt="Trophy" 
                            fill
                            className="object-contain object-bottom"
                            quality={100}
                            priority
                        />
                    </div>
                </div>
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* КАРТОЧКА 2: ДЕЙЛИ ЧЕЛЛЕНДЖ (СИНЯЯ) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/daily')}
            className="relative w-full cursor-pointer group"
          >
            {/* Контейнер карточки */}
            <div className="relative h-[160px] w-full rounded-[24px] bg-[#161616] border border-white/5 overflow-hidden flex items-center shadow-lg">
                
                {/* 1. Градиент (Тиловый/Синий) - Справа */}
                <div 
                    className="absolute right-[-20%] bottom-[-20%] w-[70%] h-[140%] pointer-events-none"
                    style={{
                        background: 'radial-gradient(50% 50% at 50% 50%, rgba(9, 87, 108, 0.5) 0%, rgba(26, 25, 28, 0) 100%)',
                        filter: 'blur(20px)',
                    }}
                />

                {/* 2. Шум */}
                <div className="absolute inset-0 bg-noise pointer-events-none opacity-20" />

                {/* 3. Текст (Слева) */}
                <div className="relative z-10 pl-8 flex flex-col justify-center h-full w-[50%]">
                    <span className="text-[20px] font-medium text-white uppercase tracking-wide leading-tight">
                        Дейли<br />челлендж
                    </span>
                </div>

                {/* 4. Картинки (Ракетки) */}
                <div className="absolute right-[-10px] bottom-0 h-full w-[55%] z-20">
                    <div className="relative w-full h-full">
                        {/* Ракетки на макете занимают почти всю правую часть */}
                        <Image 
                            src="/images/racket1.png"  
                            /* Здесь предполагается, что racket1.png - это уже композиция из двух ракеток, 
                               или вы можете наложить их друг на друга, если они раздельно */
                            alt="Rackets" 
                            fill
                            className="object-contain object-bottom-right scale-110 translate-y-2 translate-x-2"
                            quality={100}
                        />
                        
                        {/* ЕСЛИ РАКЕТКИ ОТДЕЛЬНО, РАСКОММЕНТИРУЙТЕ ЭТОТ БЛОК ВМЕСТО ВЕРХНЕГО: */}
                        
                        {/* Задняя ракетка */}
                        <div className="absolute right-[40px] bottom-[-10px] w-[120px] h-[140px] opacity-60 blur-[0.5px] rotate-[-5deg]">
                             <Image src="/images/racket2.png" alt="Back" fill className="object-contain" />
                        </div>
                        {/* Передняя ракетка */}
                        <div className="absolute right-[-10px] bottom-[-20px] w-[140px] h-[160px] rotate-[5deg]">
                             <Image src="/images/racket1.png" alt="Front" fill className="object-contain" />
                        </div>
                       
                    </div>
                </div>

            </div>
          </motion.div>

      </main>
    </div>
  );
}