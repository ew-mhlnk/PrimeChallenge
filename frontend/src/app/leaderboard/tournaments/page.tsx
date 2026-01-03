'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import useTournaments from '@/hooks/useTournaments';
import { TournamentCard } from '@/components/tournament/TournamentCard'; // Используем готовую карточку

// Модифицированная карточка, которая ведет на лидерборд, а не на сетку
import { Tournament } from '@/types';
import Link from 'next/link';

// Вспомогательная локальная карточка, чтобы переопределить ссылку
const LeaderboardTournamentCard = ({ tournament }: { tournament: Tournament }) => {
    const { impact } = useHapticFeedback();
    
    // Копируем дизайн TournamentCard, но меняем Link href
    // Проще всего обернуть готовую карточку в div, перехватить клик, но Link внутри карточки может мешать.
    // Лучше скопировать визуальную часть или сделать TournamentCard принимающей prop onClick.
    // Но так как TournamentCard жестко зашит на /tournament/[id], давай сделаем простую копию тут для скорости и безопасности
    
    // Упрощенный дизайн для списка
    return (
        <Link href={`/leaderboard/tournaments/${tournament.id}`} onClick={() => impact('light')}>
            <motion.div whileTap={{ scale: 0.98 }} className="bg-[#1C1C1E] p-4 rounded-[24px] border border-white/5 flex justify-between items-center mb-3">
                <div>
                    <h3 className="font-bold text-white text-[15px]">{tournament.name}</h3>
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

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-32">
      <header className="px-6 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-[#141414]/95 backdrop-blur z-20">
        <button 
          onClick={() => { impact('light'); router.back(); }} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
        </button>
        <h1 className="text-[20px] font-bold">Выберите турнир</h1>
      </header>

      <main className="px-4 mt-2">
        {isLoading ? (
            <div className="text-center text-[#5F6067] mt-10">Загрузка...</div>
        ) : (
            <div className="flex flex-col">
                {tournaments.map(t => (
                    <LeaderboardTournamentCard key={t.id} tournament={t} />
                ))}
                {tournaments.length === 0 && <p className="text-center opacity-50">Нет турниров</p>}
            </div>
        )}
      </main>
    </div>
  );
}