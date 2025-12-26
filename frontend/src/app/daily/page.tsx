'use client';

import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import DailyPlanned from '@/components/daily/DailyPlanned';
import DailyActive from '@/components/daily/DailyActive';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

// Иконка "Назад"
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

export default function DailyPage() {
  const router = useRouter();
  const { matches, dayStatus, isLoading, makePick } = useDailyChallenge();

  if (isLoading) {
      return (
        <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center gap-3">
             <div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
             <span className="text-[#5F6067] text-sm">Загрузка матчей...</span>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
        
        {/* Кнопка Назад (абсолютная, чтобы не занимать место в дизайне) */}
        <div className="absolute top-6 left-6 z-50">
            <button 
                onClick={() => router.back()} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform shadow-lg"
            >
                <BackIcon />
            </button>
        </div>

        <div className="pt-16">
            {/* Переключение между экранами с анимацией */}
            {dayStatus === 'PLANNED' && (
                <DailyPlanned matches={matches} onPick={makePick} />
            )}

            {(dayStatus === 'ACTIVE' || dayStatus === 'COMPLETED') && (
                <DailyActive matches={matches} status={dayStatus} />
            )}
            
            {/* Заглушка, если матчей нет вообще */}
            {!isLoading && matches.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-20 px-6 text-center opacity-60">
                    <p className="text-lg font-bold">Матчей пока нет</p>
                    <p className="text-sm text-[#8E8E93]">Парсер отдыхает, заходи позже</p>
                </div>
            )}
        </div>
    </div>
  );
}