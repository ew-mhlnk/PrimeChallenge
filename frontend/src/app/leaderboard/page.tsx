'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// Иконки
const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>);
const CupIcon = () => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);
const FireIcon = () => (<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-3 3.5-3 6 0 1.5 1 3 1 3s-3-1-3-4c0 0-3 2-3 6 0 4.418 3.582 8 8 8s8-3.582 8-8c0-4-3-6-3-6s0 3 0 4c0 0 1-1.5 1-3 0-2.5-3-6-3-6z" /></svg>);

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
      <header className="px-6 pt-8 pb-4 flex items-center justify-between relative">
        <button 
          onClick={() => { impact('light'); router.back(); }} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform z-10"
        >
          <BackIcon />
        </button>
        
        <h1 className="absolute left-0 right-0 text-center text-[20px] font-bold text-white">
            Лидерборды
        </h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* BENTO GRID */}
      <main className="px-4 mt-6 flex flex-col gap-4">
          
          {/* 1. TOURNAMENTS CARD */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/tournaments')}
            className="w-full bg-[#1C1C1E] rounded-[32px] p-6 border border-white/5 relative overflow-hidden h-[200px] flex flex-col justify-between cursor-pointer"
          >
              <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center mb-4">
                      <CupIcon />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-none">По турнирам</h2>
                  <p className="text-[#8E8E93] text-sm mt-2">Рейтинги всех прошедших и активных турниров</p>
              </div>
              
              {/* Decor */}
              <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-[#FFD700] blur-[80px] opacity-10 rounded-full" />
          </motion.div>

          {/* 2. DAILY CARD */}
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => handleNav('/leaderboard/daily')}
            className="w-full bg-[#1C1C1E] rounded-[32px] p-6 border border-white/5 relative overflow-hidden h-[200px] flex flex-col justify-between cursor-pointer"
          >
              <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF453A]/10 flex items-center justify-center mb-4">
                      <FireIcon />
                  </div>
                  <h2 className="text-2xl font-bold text-white leading-none">Дейли Челлендж</h2>
                  <p className="text-[#8E8E93] text-sm mt-2">Ежедневный рейтинг прогнозистов</p>
              </div>

              {/* Decor */}
              <div className="absolute right-[-20px] bottom-[-20px] w-32 h-32 bg-[#FF453A] blur-[80px] opacity-10 rounded-full" />
          </motion.div>

      </main>
    </div>
  );
}