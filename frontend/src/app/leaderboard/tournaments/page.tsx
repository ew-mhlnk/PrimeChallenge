'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import Link from 'next/link';

// --- ТИП ДЛЯ ЭТОЙ СТРАНИЦЫ ---
interface TournamentRanked {
    id: number;
    name: string;
    dates: string;
    status: string;
    type: string;
    tag: string;
    my_rank: number | null;
    total_participants: number;
}

// --- ХЕЛПЕР АВТОРИЗАЦИИ ---
const waitForTelegram = async () => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
};

// --- ХЕЛПЕР ЦВЕТОВ ---
const getTagColor = (tag?: string) => {
    const t = tag?.toUpperCase() || '';
    if (t === 'WTA') return 'bg-[#7B00FF]/20 text-[#D0bcff] border-[#7B00FF]/30';
    if (t === 'ATP') return 'bg-[#002BFF]/20 text-[#8E8E93] border-[#002BFF]/30';
    if (t === 'ТБШ' || t.includes('SLAM')) return 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20';
    return 'bg-white/10 text-white/70 border-white/5';
};

const LeaderboardTournamentCard = ({ item }: { item: TournamentRanked }) => {
    const { impact } = useHapticFeedback();
    const badgeStyle = getTagColor(item.tag);
    
    // Формируем текст ранга
    const rankText = item.my_rank 
        ? <><span className="text-[#00B2FF] font-bold">{item.my_rank}</span><span className="text-[#5F6067]">/{item.total_participants}</span></>
        : <span className="text-[#5F6067] text-[10px]">нет участия</span>;

    return (
        <Link href={`/leaderboard/tournaments/${item.id}`} onClick={() => impact('light')}>
            <motion.div 
                whileTap={{ scale: 0.98 }} 
                className="bg-[#1C1C1E] p-4 rounded-[24px] border border-white/5 flex justify-between items-center mb-3 transition-colors active:bg-[#2C2C2E]"
            >
                {/* ЛЕВАЯ ЧАСТЬ */}
                <div>
                    <h3 className="font-bold text-white text-[15px] leading-tight mb-1.5">
                        {item.name}
                    </h3>
                    <div className="flex gap-2 text-xs items-center">
                        <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold uppercase border ${badgeStyle}`}>
                            {item.type || item.tag || 'ATP'}
                        </span>
                        <span className="text-[#8E8E93] text-[11px]">{item.dates}</span>
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
  const { impact } = useHapticFeedback();
  
  const [data, setData] = useState<TournamentRanked[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const load = async () => {
          try {
              const initData = await waitForTelegram();
              const res = await fetch('/api/leaderboard/list', {
                  headers: { Authorization: initData || '' }
              });
              if (res.ok) {
                  const json = await res.json();
                  setData(json);
              }
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      load();
  }, []);

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
        {loading ? (
            <div className="flex justify-center mt-20">
                <div className="w-6 h-6 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
            </div>
        ) : (
            <div className="flex flex-col">
                {data.length > 0 ? (
                    data.map(item => (
                        <LeaderboardTournamentCard key={item.id} item={item} />
                    ))
                ) : (
                    <div className="text-center mt-20 opacity-50 text-sm">
                        Нет завершенных турниров
                    </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}