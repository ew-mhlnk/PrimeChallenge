'use client';

import { useRouter } from 'next/navigation';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import DailyPlanned from '@/components/daily/DailyPlanned';
import DailyActive from '@/components/daily/DailyActive';
import { DateSelector } from '@/components/daily/DateSelector';
import { motion, AnimatePresence } from 'framer-motion';

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

export default function DailyPage() {
  const router = useRouter();
  const { matches, dayStatus, isLoading, makePick, selectedDate, setSelectedDate } = useDailyChallenge();

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24">
        
        {/* --- 1. ШАПКА --- */}
        <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-2 px-6">
            <div className="relative flex items-center justify-center mb-6">
                {/* Кнопка Назад (Слева) */}
                <button 
                    onClick={() => router.back()} 
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                >
                    <BackIcon />
                </button>

                {/* Заголовок (Центр) */}
                <h1 className="text-[20px] font-bold text-[#616171] tracking-tight">
                    Дейли Челлендж
                </h1>
            </div>

            {/* --- 2. СЕЛЕКТОР ДАТЫ --- */}
            <DateSelector selectedDate={selectedDate} onSelect={setSelectedDate} />
        </header>

        {/* --- 3. КОНТЕНТ --- */}
        <main className="px-4 mt-2">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
                    <div className="text-[40px] mb-2">🎾</div>
                    <p className="text-sm font-medium">Матчей нет</p>
                    <p className="text-xs text-[#616171]">На эту дату игр не запланировано</p>
                </div>
            ) : (
                <motion.div 
                    key={selectedDate.toISOString()} // Анимация при смене даты
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ duration: 0.3 }}
                >
                    {/* Логика отображения по статусу дня */}
                    {dayStatus === 'PLANNED' && <DailyPlanned matches={matches} onPick={makePick} />}
                    {(dayStatus === 'ACTIVE' || dayStatus === 'COMPLETED') && (
                        <DailyActive matches={matches} status={dayStatus} />
                    )}
                </motion.div>
            )}
        </main>
    </div>
  );
}