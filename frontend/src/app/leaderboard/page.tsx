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
          {/* КАРТОЧКА 1: ПО ТУРНИРАМ (ЗОЛОТОЙ) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/tournaments')}
            className="relative w-full cursor-pointer group"
          >
            <div className="rounded-[24px] p-[1px] bg-gradient-to-b from-[#212121] to-[#161616]">
                <div className="relative h-[144px] w-full rounded-[23px] bg-[#1B1A1E] overflow-hidden flex items-center">
                    
                    {/* Градиент */}
                    <div 
                        className="absolute bottom-0 right-0 w-[80%] h-[120%] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse 85.22% 117.16% at 100.00% 100.00%, #6C4D09 0%, rgba(26, 25, 28, 0) 100%)',
                            opacity: 0.8
                        }}
                    />

                    {/* Шум + Блик */}
                    <div className="absolute inset-0 bg-noise pointer-events-none opacity-40" />
                    <div className="animate-shine" />

                    {/* Текст (Слева) - ширина 50%, чтобы не наезжал на кубок */}
                    <div className="relative z-10 pl-6 flex flex-col justify-center h-full w-[50%]">
                        <h2 className="text-[22px] font-bold text-white leading-tight mb-2 whitespace-nowrap">
                            По Турнирам
                        </h2>
                        <p className="text-[#8E8E93] text-[12px] font-medium leading-[1.3] line-clamp-2">
                            Рейтинги всех прошедших и активных турниров
                        </p>
                    </div>

                    {/* --- КАРТИНКА КУБКА (УВЕЛИЧЕНА x1.5) --- */}
                    {/* Используем w-[...] для адаптивности, max-w для десктопа */}
                    <div className="absolute right-[-15px] bottom-[-25px] w-[180px] sm:w-[220px] z-20 animate-float pointer-events-none">
                        <Image 
                            src="/images/trophie_lb.png" 
                            alt="Trophy" 
                            width={357} /* Указал исходный * 1.5 для рендеринга */
                            height={243}
                            quality={100} /* Максимальное качество */
                            unoptimized={true} /* Отключаем сжатие Next.js для четкости */
                            className="object-contain drop-shadow-2xl"
                            style={{ width: '100%', height: 'auto' }}
                        />
                    </div>
                </div>
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* КАРТОЧКА 2: ДЕЙЛИ ЧЕЛЛЕНДЖ (СИНИЙ) */}
          {/* ========================================== */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/daily')}
            className="relative w-full cursor-pointer group"
          >
            <div className="rounded-[24px] p-[1px] bg-gradient-to-b from-[#212121] to-[#161616]">
                <div className="relative h-[144px] w-full rounded-[23px] bg-[#1B1A1E] overflow-hidden flex items-center">
                    
                    {/* Градиент */}
                    <div 
                        className="absolute bottom-0 right-0 w-[80%] h-[120%] pointer-events-none"
                        style={{
                            background: 'radial-gradient(ellipse 85.22% 117.16% at 100.00% 100.00%, #09576C 0%, rgba(26, 25, 28, 0) 100%)',
                            opacity: 0.8
                        }}
                    />

                    {/* Шум + Блик */}
                    <div className="absolute inset-0 bg-noise pointer-events-none opacity-40" />
                    <div className="animate-shine" style={{ animationDelay: '1.5s' }} />

                    {/* Текст */}
                    <div className="relative z-10 pl-6 flex flex-col justify-center h-full w-[50%]">
                        <h2 className="text-[22px] font-bold text-white leading-tight mb-2 whitespace-nowrap">
                            Дейли Челлендж
                        </h2>
                        <p className="text-[#8E8E93] text-[12px] font-medium leading-tight">
                            Ежедневный рейтинг прогнозистов
                        </p>
                    </div>

                    {/* --- КАРТИНКИ РАКЕТОК (УВЕЛИЧЕНЫ x1.5) --- */}
                    <div className="absolute right-[-10px] bottom-[-20px] w-[220px] sm:w-[260px] h-[200px] z-20 pointer-events-none">
                        
                        {/* Ракетка 2 (Задняя) - Размытая */}
                        <div className="absolute right-[20px] bottom-[20px] w-[80%] animate-float-delayed z-20">
                            <Image 
                                src="/images/racket2.png" 
                                alt="Racket Back" 
                                width={363}
                                height={216}
                                quality={100}
                                unoptimized={true}
                                className="object-contain opacity-60 blur-[1px]"
                                style={{ width: '100%', height: 'auto', transform: 'rotate(-10deg)' }}
                            />
                        </div>
                        
                        {/* Ракетка 1 (Передняя) - Четкая */}
                        <div className="absolute right-[0px] bottom-[0px] w-[90%] animate-float z-30">
                            <Image 
                                src="/images/racket1.png" 
                                alt="Racket Front" 
                                width={402}
                                height={282}
                                quality={100}
                                unoptimized={true}
                                className="object-contain drop-shadow-2xl"
                                style={{ width: '100%', height: 'auto' }}
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