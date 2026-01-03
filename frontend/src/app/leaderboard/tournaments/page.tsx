'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import useTournaments from '@/hooks/useTournaments';
import { useProfileContext } from '@/context/ProfileContext'; // <--- Импортируем профиль для рангов
import Link from 'next/link';
import { Tournament } from '@/types';

// Хелпер для цветов тегов
const getTagColor = (tag?: string) => {
    const t = tag?.toUpperCase() || '';
    if (t === 'WTA') return 'bg-[#7B00FF]/20 text-[#D0bcff] border-[#7B00FF]/30'; // Фиолетовый
    if (t === 'ATP') return 'bg-[#002BFF]/20 text-[#8E8E93] border-[#002BFF]/30'; // Синий (чуть спокойнее)
    if (t === 'ТБШ' || t.includes('SLAM')) return 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20'; // Золотой
    return 'bg-white/10 text-white/70 border-white/5'; // Дефолт
};

const LeaderboardTournamentCard = ({ 
    tournament, 
    rankData 
}: { 
    tournament: Tournament, 
    rankData?: { rank: number, total: number } 
}) => {
    const { impact } = useHapticFeedback();
    
    // Определяем цвет плашки по ТЕГУ (ATP/WTA), а текст берем из ТИПА (ATP-250)
    const badgeStyle = getTagColor(tournament.tag);
    
    // Формируем текст ранга
    const rankText = rankData 
        ? <><span className="text-[#00B2FF] font-bold">{rankData.rank}</span><span className="text-[#5F6067]">/{rankData.total}</span></>
        : <span className="text-[#5F6067] text-[10px]">нет участия</span>;

    return (
        <Link href={`/leaderboard/tournaments/${tournament.id}`} onClick={() => impact('light')}>
            <motion.div 
                whileTap={{ scale: 0.98 }} 
                className="bg-[#1C1C1E] p-4 rounded-[24px] border border-white/5 flex justify-between items-center mb-3 transition-colors active:bg-[#2C2C2E]"
            >
                {/* ЛЕВАЯ ЧАСТЬ */}
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                         <h3 className="font-bold text-white text-[15px] leading-tight">{tournament.name}</h3>
                    </div>
                    
                    <div className="flex gap-2 text-xs items-center">
                        {/* ТЕГ: Берем tournament.type (ATP-250), красим по tournament.tag */}
                        <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold uppercase border ${badgeStyle}`}>
                            {tournament.type || tournament.tag || 'ATP'}
                        </span>
                        <span className="text-[#8E8E93] text-[11px]">{tournament.dates}</span>
                    </div>
                </div>

                {/* ПРАВАЯ ЧАСТЬ (Ранг) */}
                <div className="flex flex-col items-end justify-center pl-4">
                    <div className="bg-[#141414] rounded-[12px] px-3 py-1.5 border border-white/5 flex items-center gap-1 text-sm font-mono">
                        {rankText}
                    </div>
                    <span className="text-[9px] text-[#5F6067] mt-1 pr-1">ваше место</span>
                </div>
            </motion.div>
        </Link>
    );
}

export default function TournamentListLeaderboard() {
  const router = useRouter();
  const { tournaments, isLoading } = useTournaments();
  const { stats } = useProfileContext(); // <--- Берем статистику юзера
  const { impact } = useHapticFeedback();

  // Фильтрация: ACTIVE, COMPLETED, CLOSED
  const visibleTournaments = tournaments.filter(t => 
      ['ACTIVE', 'COMPLETED', 'CLOSED'].includes(t.status)
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
                    visibleTournaments.map(t => {
                        // Ищем статистику для этого турнира в профиле
                        // stats.history содержит массив TournamentHistoryRow
                        const myStat = stats?.history?.find(h => h.tournament_id === t.id);
                        
                        const rankData = myStat ? {
                            rank: myStat.rank,
                            total: myStat.total_participants
                        } : undefined;

                        return (
                            <LeaderboardTournamentCard 
                                key={t.id} 
                                tournament={t} 
                                rankData={rankData}
                            />
                        );
                    })
                ) : (
                    <div className="text-center mt-20 opacity-50 text-sm">
                        Нет доступных турниров
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}