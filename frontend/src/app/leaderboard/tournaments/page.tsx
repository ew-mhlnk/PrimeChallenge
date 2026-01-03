'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import useTournaments from '@/hooks/useTournaments';
import Link from 'next/link';
import { Tournament } from '@/types';

// Вспомогательная карточка
const LeaderboardTournamentCard = ({ tournament }: { tournament: Tournament }) => {
    const { impact } = useHapticFeedback();
    
    // Определяем цвет статуса для красоты
    const isLive = tournament.status === 'ACTIVE';
    
    return (
        <Link href={`/leaderboard/tournaments/${tournament.id}`} onClick={() => impact('light')}>
            <motion.div 
                whileTap={{ scale: 0.98 }} 
                className={`
                    p-4 rounded-[24px] border flex justify-between items-center mb-3 transition-colors
                    ${isLive ? 'bg-[#1C1C1E] border-[#32D74B]/30' : 'bg-[#1C1C1E] border-white/5'}
                `}
            >
                <div>
                    <div className="flex items-center gap-2">
                         <h3 className="font-bold text-white text-[15px]">{tournament.name}</h3>
                         {isLive && (
                             <span className="bg-[#32D74B] text-black text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                                LIVE
                             </span>
                         )}
                    </div>
                    <div className="flex gap-2 text-xs text-[#8E8E93] mt-1">
                        <span className="bg-white/10 px-1.5 rounded text-white/70">{tournament.type || 'ATP'}</span>
                        <span>{tournament.dates}</span>
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5F6067" strokeWidth="2"><path d="M9 18L15 12L9 6"/></svg>
                </div>
            </motion.div>
        </Link>
    );
}

export default function TournamentListLeaderboard() {
  const router = useRouter();
  const { tournaments, isLoading } = useTournaments();
  const { impact } = useHapticFeedback();

  // --- ФИЛЬТРАЦИЯ ---
  // Оставляем только ACTIVE и COMPLETED (исключаем PLANNED)
  const visibleTournaments = tournaments.filter(t => 
      t.status === 'ACTIVE' || t.status === 'COMPLETED' || t.status === 'CLOSED'
  );

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-32">
      <header className="px-6 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-[#141414]/95 backdrop-blur z-20 border-b border-white/5">
        <button 
          onClick={() => { impact('light'); router.back(); }} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
        </button>
        <h1 className="text-[20px] font-bold">Выберите турнир</h1>
      </header>

      <main className="px-4 mt-4">
        {isLoading ? (
            <div className="flex justify-center mt-20">
                <div className="w-6 h-6 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
            </div>
        ) : (
            <div className="flex flex-col">
                {visibleTournaments.length > 0 ? (
                    visibleTournaments.map(t => (
                        <LeaderboardTournamentCard key={t.id} tournament={t} />
                    ))
                ) : (
                    <div className="text-center mt-20 opacity-50 text-sm">
                        Нет завершенных или активных турниров
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}