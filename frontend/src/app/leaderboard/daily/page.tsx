'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// --- ТИПЫ ДАННЫХ ---
interface DailyLeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    total_points: number;
    correct_picks: number;
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

// --- ИКОНКИ ---
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 19L8 12L15 5" />
    </svg>
);

const FireIconMini = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2c0 0-3 3.5-3 6 0 1.5 1 3 1 3s-3-1-3-4c0 0-3 2-3 6 0 4.418 3.582 8 8 8s8-3.582 8-8c0-4-3-6-3-6s0 3 0 4c0 0 1-1.5 1-3 0-2.5-3-6-3-6z" />
    </svg>
);

export default function DailyLeaderboardPage() {
    const router = useRouter();
    const { impact } = useHapticFeedback();
    
    const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const initData = await waitForTelegram();
                
                // Делаем запрос к API Дейли Лидерборда
                const response = await fetch('/api/daily/leaderboard', { 
                    headers: { Authorization: initData || '' } 
                });
                
                if (!response.ok) throw new Error('Ошибка загрузки');
                
                const data = await response.json();
                setLeaderboard(data);
            } catch (err) {
                console.error(err);
                setError('Не удалось загрузить рейтинг');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    return (
        <div className="min-h-screen bg-[#141414] text-white pb-32">
            
            {/* --- HEADER --- */}
            <header className="px-6 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-[#141414]/95 backdrop-blur z-20 border-b border-white/5">
                <button 
                    onClick={() => { impact('light'); router.back(); }} 
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
                >
                    <BackIcon />
                </button>
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <h1 className="text-[18px] font-bold leading-none">Дейли Рейтинг</h1>
                        <FireIconMini />
                    </div>
                    <span className="text-[#8E8E93] text-xs mt-0.5">Топ прогнозистов по дням</span>
                </div>
            </header>

            {/* --- CONTENT --- */}
            <main className="px-4 mt-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center mt-20 gap-3">
                        <div className="w-6 h-6 border-2 border-[#FF453A] border-t-transparent rounded-full animate-spin" />
                        <span className="text-[#5F6067] text-sm">Загрузка...</span>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 mt-20 text-sm">{error}</div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center text-[#5F6067] mt-20 text-sm">Лидерборд пока пуст</div>
                ) : (
                    <div className="bg-[#1C1C1E] rounded-[24px] border border-white/5 overflow-hidden shadow-lg">
                        {leaderboard.map((entry, index) => {
                            // Логика цветов для ТОП-3
                            let rankColor = "text-[#8E8E93]"; // Серый для остальных
                            let rowBg = ""; // Фон строки

                            if (index === 0) { 
                                rankColor = "text-[#FFD700]"; // Золото
                                rowBg = "bg-[#FFD700]/5"; 
                            } 
                            if (index === 1) { 
                                rankColor = "text-[#C0C0C0]"; // Серебро
                                rowBg = "bg-[#C0C0C0]/5";
                            } 
                            if (index === 2) { 
                                rankColor = "text-[#CD7F32]"; // Бронза
                                rowBg = "bg-[#CD7F32]/5";
                            } 

                            return (
                                <div 
                                    key={entry.user_id} 
                                    className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${rowBg}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`w-6 text-center font-bold text-lg ${rankColor}`}>
                                            {entry.rank}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white text-[15px]">
                                                {entry.username}
                                            </span>
                                            <span className="text-[11px] text-[#5F6067]">
                                                {entry.correct_picks} верных исходов
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <span className="block text-[#32D74B] font-bold text-lg leading-none">
                                            {entry.total_points}
                                        </span>
                                        <span className="text-[9px] text-[#5F6067] uppercase tracking-wide">
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