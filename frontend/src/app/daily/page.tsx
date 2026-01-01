'use client';

import { useRouter } from 'next/navigation';
import { useDailyChallenge } from '@/hooks/useDailyChallenge';
import { DateSelector } from '@/components/daily/DateSelector';
import { DailyMatchCard } from '@/components/daily/DailyMatchCard';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '@/components/daily/Daily.module.css'; // Импортируем стили

const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
);

export default function DailyPage() {
  const router = useRouter();
  const { matches, isLoading, makePick, selectedDate, setSelectedDate } = useDailyChallenge();

  // 1. Считаем статистику для хедера
  const finishedOrLiveCount = matches.filter(m => m.status !== 'PLANNED').length;
  const correctPicks = matches.filter(m => m.status === 'COMPLETED' && m.my_pick && m.my_pick === m.winner).length;
  
  // Показываем блок результатов, только если игра уже началась (есть Live или Completed)
  const showResultBlock = finishedOrLiveCount > 0;

  if (isLoading) {
      return (
        <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center gap-3">
             <div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
             <span className="text-[#5F6067] text-sm">Загрузка матчей...</span>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-24">
        
        {/* --- 1. ШАПКА --- */}
        <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-2 px-6 border-b border-white/5">
            <div className="relative flex items-center justify-center mb-6">
                <button 
                    onClick={() => router.back()} 
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                >
                    <BackIcon />
                </button>
                <h1 className="text-[20px] font-bold text-[#616171] tracking-tight">
                    Дейли Челлендж
                </h1>
            </div>

            <DateSelector selectedDate={selectedDate} onSelect={setSelectedDate} />
        </header>

        {/* --- 2. КОНТЕНТ --- */}
        <main className="px-4 mt-6">
            
            {/* БЛОК РЕЗУЛЬТАТА (Только если есть активность) */}
            {showResultBlock && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className={styles.resultBlock} // Используем стиль из CSS модуля
                >
                    <div className={styles.resultLabel}>
                        <span className={styles.resultTitle}>Твой результат</span>
                        <span className={styles.resultSubtitle}>за этот день</span>
                    </div>
                    <div className={styles.resultScore}>
                        <span 
                            className={styles.resultValue}
                            style={{ color: correctPicks > 0 ? '#32D74B' : '#FFFFFF' }} // Зеленый только если > 0
                        >
                            {correctPicks}
                        </span>
                        {/* Показываем сколько всего матчей завершено/идет, а не всего вообще */}
                        <span className={styles.resultTotal}>/ {finishedOrLiveCount}</span> 
                    </div>
                </motion.div>
            )}

            {/* СПИСОК МАТЧЕЙ */}
            {matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
                    <div className="text-[40px] mb-2">🎾</div>
                    <p className="text-sm font-medium">Матчей нет</p>
                    <p className="text-xs text-[#616171]">На эту дату игр не запланировано</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <AnimatePresence mode='popLayout'>
                        {matches.map((match) => (
                            <motion.div 
                                key={match.id} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                transition={{ duration: 0.3 }}
                            >
                                <DailyMatchCard 
                                    match={match} 
                                    onPick={makePick} 
                                    // ВАЖНО: Блокируем только если НЕ planned.
                                    // Если PLANNED - можно кликать и менять выбор сколько угодно.
                                    disabled={match.status !== 'PLANNED'} 
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </main>
    </div>
  );
}