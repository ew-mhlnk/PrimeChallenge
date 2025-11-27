'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '@/types';

// Хелпер
const waitForTelegram = async () => {
    let attempts = 0;
    while (!window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return window.Telegram?.WebApp?.initData;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const initData = await waitForTelegram();
        // Если нет телеграма, можно показать заглушку или пустой список
        if (!initData && typeof window !== 'undefined') {
             // console.warn("No initData"); 
        }

        // --- ИСПРАВЛЕНИЕ: Типизация headers ---
        const headers: Record<string, string> = {};
        if (initData) headers['Authorization'] = initData;

        // ВАЖНО: Используем прокси /api/leaderboard/
        const response = await fetch('/api/leaderboard/', { headers });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data = await response.json();
        setLeaderboard(data);
      } catch (err) {
        // --- ИСПРАВЛЕНИЕ: Используем переменную err ---
        console.error(err);
        setError('Не удалось загрузить');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32">
      
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-3xl font-bold text-white">Лидерборд</h1>
        <p className="text-[#8E8E93] text-sm mt-1">Топ игроков сезона 2025</p>
      </header>

      <main className="px-4">
        {loading ? (
            <p className="text-[#5F6067] text-center mt-10">Загрузка...</p>
        ) : error ? (
            <p className="text-red-500 text-center mt-10">{error}</p>
        ) : leaderboard.length === 0 ? (
            <p className="text-[#5F6067] text-center mt-10">Лидерборд пуст</p>
        ) : (
            <div className="bg-[#1C1C1E] rounded-[24px] border border-white/5 overflow-hidden">
                {leaderboard.map((entry, index) => {
                    // Стили для Топ-3
                    let rankStyle = "text-[#8E8E93] font-medium";
                    let rowBg = "hover:bg-white/5";
                    
                    if (index === 0) { rankStyle = "text-[#FFD700] font-bold text-lg"; rowBg = "bg-[#FFD700]/10"; } // Gold
                    if (index === 1) { rankStyle = "text-[#C0C0C0] font-bold text-lg"; rowBg = "bg-[#C0C0C0]/10"; } // Silver
                    if (index === 2) { rankStyle = "text-[#CD7F32] font-bold text-lg"; rowBg = "bg-[#CD7F32]/10"; } // Bronze

                    return (
                        <div 
                            key={entry.user_id} 
                            className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 transition ${rowBg}`}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`w-8 text-center ${rankStyle}`}>
                                    {index + 1}
                                </span>
                                <div className="flex flex-col">
                                    <span className="font-bold text-[15px] text-white">
                                        {entry.username || `User ${entry.user_id}`}
                                    </span>
                                    <span className="text-[12px] text-[#5F6067]">
                                        {entry.correct_picks} побед
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-[16px] font-bold text-[#32D74B]">
                                    {entry.score}
                                </span>
                                <span className="text-[10px] text-[#5F6067] uppercase tracking-wide">
                                    PTS
                                </span>
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