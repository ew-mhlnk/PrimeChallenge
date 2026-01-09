'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { motion } from 'framer-motion';

// --- ТИПЫ ---
interface DailyLeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    total_points: number;
    correct_picks: number;
    // photo_url?: string; // Если бэкенд начнет отдавать фото
}

// --- ХЕЛПЕРЫ ---
const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

// Генерация цвета аватара по ID (чтобы у одного юзера всегда был один цвет)
const getAvatarColor = (id: number) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-red-500', 'bg-indigo-500'];
    return colors[id % colors.length];
};

const waitForTelegram = async () => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
};

// --- ИКОНКИ ---
const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5" /></svg>
);

export default function DailyLeaderboardPage() {
    const router = useRouter();
    const { impact } = useHapticFeedback();
    
    const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const tg = await waitForTelegram();
            if (tg) {
                setCurrentUserId(tg.initDataUnsafe?.user?.id || null);
                
                try {
                    const res = await fetch('/api/daily/leaderboard', { 
                        headers: { Authorization: tg.initData } 
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setLeaderboard(data);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            }
        };
        init();
    }, []);

    // Распределяем места
    const top1 = leaderboard.find(u => u.rank === 1);
    const top2 = leaderboard.find(u => u.rank === 2);
    const top3 = leaderboard.find(u => u.rank === 3);
    
    // Остальные (с 4 места)
    const restList = leaderboard.filter(u => u.rank > 3);

    // Текущий пользователь
    const currentUserEntry = leaderboard.find(u => u.user_id === currentUserId);

    // Компонент аватара
    const Avatar = ({ user, size = 'md' }: { user?: DailyLeaderboardEntry, size?: 'sm'|'md'|'lg' }) => {
        if (!user) return <div className="w-10 h-10 rounded-full bg-white/5" />;
        
        const sizeClass = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'md' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm';
        
        return (
            <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-[#141414] ${getAvatarColor(user.user_id)}`}>
                {getInitials(user.username)}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white pb-32">
            
            {/* --- HEADER (Стандартный) --- */}
            <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-white/5">
                <div className="relative flex items-center justify-center min-h-[40px]">
                    <button 
                        onClick={() => { impact('light'); router.back(); }} 
                        className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                    >
                        <BackIcon />
                    </button>
                    <h1 className="text-[20px] font-bold text-white tracking-tight leading-none">
                        Дейли Рейтинг
                    </h1>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center mt-20">
                    <div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <main className="px-4 mt-6 flex flex-col gap-6">
                    
                    {/* --- 1. ПОДИУМ (TOP 3) --- */}
                    {leaderboard.length > 0 && (
                        <div className="relative w-full h-[240px] mt-4 mb-2">
                            
                            {/* Картинка стенда (внизу) */}
                            <div className="absolute bottom-0 left-0 right-0 h-[120px] z-10 flex justify-center items-end">
                                <div className="relative w-full max-w-[340px] h-full">
                                    <Image 
                                        src="/images/stand.png" 
                                        alt="Podium" 
                                        fill 
                                        className="object-contain object-bottom"
                                        priority
                                        quality={100}
                                        unoptimized
                                    />
                                </div>
                            </div>

                            {/* --- ИГРОКИ (Абсолютное позиционирование) --- */}
                            
                            {/* 2 МЕСТО (Слева) */}
                            {top2 && (
                                <div className="absolute bottom-[85px] left-[15%] flex flex-col items-center z-20 w-[80px]">
                                    <Avatar user={top2} size="md" />
                                    <span className="text-[11px] font-bold mt-1 text-gray-300 truncate w-full text-center">{top2.username}</span>
                                    <span className="text-[10px] text-[#00B2FF] font-bold">{top2.total_points} pts</span>
                                </div>
                            )}

                            {/* 1 МЕСТО (Центр, Выше всех) */}
                            {top1 && (
                                <div className="absolute bottom-[115px] left-1/2 -translate-x-1/2 flex flex-col items-center z-30 w-[100px]">
                                    {/* Корона или эффект можно добавить тут */}
                                    <div className="mb-1 text-yellow-400 text-lg">👑</div>
                                    <Avatar user={top1} size="lg" />
                                    <span className="text-[13px] font-bold mt-1 text-white truncate w-full text-center">{top1.username}</span>
                                    <span className="text-[12px] text-[#00B2FF] font-bold">{top1.total_points} pts</span>
                                </div>
                            )}

                            {/* 3 МЕСТО (Справа) */}
                            {top3 && (
                                <div className="absolute bottom-[65px] right-[15%] flex flex-col items-center z-20 w-[80px]">
                                    <Avatar user={top3} size="md" />
                                    <span className="text-[11px] font-bold mt-1 text-[#CD7F32] truncate w-full text-center">{top3.username}</span>
                                    <span className="text-[10px] text-[#00B2FF] font-bold">{top3.total_points} pts</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- 2. МОЙ РЕЗУЛЬТАТ (Sticky User) --- */}
                    {currentUserEntry && (
                        <div className="sticky top-[80px] z-20 pb-2 bg-[#141414]"> {/* bg нужен чтобы перекрыть скролл */}
                            <div className="leaderboard-card h-[50px] w-full flex items-center justify-between px-4 shadow-[0_0_20px_rgba(0,178,255,0.15)] relative overflow-hidden">
                                {/* Легкий подсвет для себя */}
                                <div className="absolute inset-0 bg-[#00B2FF]/5 pointer-events-none" />
                                
                                <div className="flex items-center gap-3 relative z-10">
                                    <span className="text-[#00B2FF] font-bold text-sm w-6 text-center">
                                        #{currentUserEntry.rank}
                                    </span>
                                    <Avatar user={currentUserEntry} size="sm" />
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-white leading-none">
                                            Вы
                                        </span>
                                        <span className="text-[10px] text-[#5F6067]">
                                            {currentUserEntry.correct_picks} угаданных
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right relative z-10">
                                    <span className="text-[#00B2FF] font-bold text-lg">
                                        {currentUserEntry.total_points}
                                    </span>
                                    <span className="text-[9px] text-[#5F6067] ml-1 uppercase">PTS</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- 3. СПИСОК ОСТАЛЬНЫХ --- */}
                    <div className="flex flex-col gap-2">
                        {restList.map((entry) => (
                            <div 
                                key={entry.user_id} 
                                className="leaderboard-card h-[50px] w-full flex items-center justify-between px-4"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[#5F6067] font-bold text-xs w-6 text-center">
                                        {entry.rank}
                                    </span>
                                    <Avatar user={entry} size="sm" />
                                    <span className="text-[13px] font-medium text-[#EBEBF5]">
                                        {entry.username}
                                    </span>
                                </div>

                                <div className="text-right">
                                    <span className="text-[#00B2FF] font-bold text-[15px]">
                                        {entry.total_points}
                                    </span>
                                </div>
                            </div>
                        ))}
                        
                        {restList.length === 0 && leaderboard.length > 3 && (
                            <div className="text-center text-[#5F6067] text-sm py-4">
                                Больше участников нет
                            </div>
                        )}
                    </div>

                </main>
            )}
        </div>
    );
}