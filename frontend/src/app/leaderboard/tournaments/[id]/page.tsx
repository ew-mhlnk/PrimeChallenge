'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LeaderboardEntry } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const waitForTelegram = async () => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
};

export default function TournamentLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { impact } = useHapticFeedback();
  
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const load = async () => {
          const initData = await waitForTelegram();
          try {
              const res = await fetch(`/api/leaderboard/tournament/${id}`, {
                  headers: { Authorization: initData || '' }
              });
              if(res.ok) {
                  const json = await res.json();
                  setData(json);
              }
          } catch(e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      load();
  }, [id]);

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-32">
        <header className="px-6 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-[#141414]/95 backdrop-blur z-20 border-b border-white/5">
            <button 
                onClick={() => { impact('light'); router.back(); }} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>
            </button>
            <div className="flex flex-col">
                <h1 className="text-[18px] font-bold leading-none">Турнирный рейтинг</h1>
                <span className="text-[#8E8E93] text-xs">Турнир #{id}</span>
            </div>
        </header>

        <main className="px-4 mt-4">
            {loading ? (
                <div className="text-center text-[#5F6067] mt-10">Загрузка рейтинга...</div>
            ) : data.length === 0 ? (
                <div className="text-center text-[#5F6067] mt-10">Пока пусто</div>
            ) : (
                <div className="bg-[#1C1C1E] rounded-[24px] border border-white/5 overflow-hidden">
                    {data.map((entry, index) => {
                        let rankColor = "text-[#8E8E93]";
                        if (index === 0) rankColor = "text-[#FFD700]";
                        if (index === 1) rankColor = "text-[#C0C0C0]";
                        if (index === 2) rankColor = "text-[#CD7F32]";
                        
                        return (
                            <div key={entry.user_id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-4">
                                    <span className={`w-6 text-center font-bold ${rankColor} text-lg`}>{index + 1}</span>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-[15px]">{entry.username}</span>
                                        <span className="text-xs text-[#5F6067]">{entry.correct_picks} угаданных</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-[#32D74B] font-bold text-lg">{entry.score}</span>
                                    <span className="text-[10px] text-[#5F6067] uppercase">PTS</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    </div>
  );
}