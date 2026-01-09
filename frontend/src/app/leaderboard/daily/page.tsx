'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// --- ТИПЫ ---
interface DailyLeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    total_points: number;
    correct_picks: number;
}

// --- ХЕЛПЕРЫ ---
const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const waitForTelegram = async () => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
};

// --- ПРЕМИУМ ГРАДИЕНТЫ ДЛЯ АВАТАРОК ---
// Вместо детских цветов используем глубокие, дорогие оттенки
const getPremiumGradient = (id: number) => {
    const gradients = [
        'bg-gradient-to-br from-[#141E30] to-[#243B55]', // Midnight Blue
        'bg-gradient-to-br from-[#232526] to-[#414345]', // Gunmetal
        'bg-gradient-to-br from-[#1e130c] to-[#9a8478]', // Coffee
        'bg-gradient-to-br from-[#000000] to-[#434343]', // Pure Dark
        'bg-gradient-to-br from-[#16222A] to-[#3A6073]', // Deep Sea
        'bg-gradient-to-br from-[#191654] to-[#43C6AC]', // Dark Emerald
    ];
    return gradients[id % gradients.length];
};

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

    const top1 = leaderboard.find(u => u.rank === 1);
    const top2 = leaderboard.find(u => u.rank === 2);
    const top3 = leaderboard.find(u => u.rank === 3);
    const restList = leaderboard.filter(u => u.rank > 3);
    const currentUserEntry = leaderboard.find(u => u.user_id === currentUserId);

    // --- КОМПОНЕНТ АВАТАРА (PREMIUM STYLE) ---
    const Avatar = ({ user, size = 'md', rank = 0 }: { user?: DailyLeaderboardEntry, size?: 'sm'|'md'|'lg', rank?: number }) => {
        if (!user) return <div className="w-10 h-10 rounded-full bg-white/5" />;
        
        let sizeClass = 'w-10 h-10 text-xs'; // sm
        if (size === 'md') sizeClass = 'w-12 h-12 text-sm';
        if (size === 'lg') sizeClass = 'w-16 h-16 text-lg';

        // Цвет обводки зависит от места
        let ringColor = 'ring-white/10'; // Обычный
        if (rank === 1) ringColor = 'ring-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]'; // Gold
        if (rank === 2) ringColor = 'ring-[#C0C0C0] shadow-[0_0_10px_rgba(192,192,192,0.2)]'; // Silver
        if (rank === 3) ringColor = 'ring-[#CD7F32] shadow-[0_0_10px_rgba(205,127,50,0.2)]'; // Bronze

        return (
            <div className={`
                ${sizeClass} rounded-full flex items-center justify-center 
                font-bold text-white/90 ring-1 ${ringColor} 
                ${getPremiumGradient(user.user_id)}
                relative z-10
            `}>
                {getInitials(user.username)}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white pb-32">
            
            {/* HEADER */}
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
                <main className="px-4 mt-6 flex flex-col gap-4">
                    
                    {/* --- 1. ПОДИУМ (TOP 3) --- */}
                    {leaderboard.length > 0 && (
                        <div className="relative w-full h-[240px] mt-2 mb-4">
                            
                            {/* Картинка стенда */}
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

                            {/* --- ИГРОКИ --- */}
                            
                            {/* 2 МЕСТО */}
                            {top2 && (
                                <div className="absolute bottom-[95px] left-[15%] flex flex-col items-center z-20 w-[80px]">
                                    <Avatar user={top2} size="md" rank={2} />
                                    <span className="text-[11px] font-semibold mt-1.5 text-gray-300 truncate w-full text-center drop-shadow-md">
                                        {top2.username}
                                    </span>
                                    <span className="text-[10px] text-[#00B2FF] font-bold tracking-wide">{top2.total_points} pts</span>
                                </div>
                            )}

                            {/* 1 МЕСТО */}
                            {top1 && (
                                <div className="absolute bottom-[130px] left-1/2 -translate-x-1/2 flex flex-col items-center z-30 w-[100px]">
                                    {/* Корона */}
                                    <div className="mb-1 text-[#FFD700] text-lg drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">👑</div>
                                    <Avatar user={top1} size="lg" rank={1} />
                                    <span className="text-[13px] font-bold mt-1.5 text-white truncate w-full text-center drop-shadow-md">
                                        {top1.username}
                                    </span>
                                    <span className="text-[12px] text-[#00B2FF] font-bold tracking-wide">{top1.total_points} pts</span>
                                </div>
                            )}

                            {/* 3 МЕСТО */}
                            {top3 && (
                                <div className="absolute bottom-[75px] right-[15%] flex flex-col items-center z-20 w-[80px]">
                                    <Avatar user={top3} size="md" rank={3} />
                                    <span className="text-[11px] font-semibold mt-1.5 text-[#B87C59] truncate w-full text-center drop-shadow-md">
                                        {top3.username}
                                    </span>
                                    <span className="text-[10px] text-[#00B2FF] font-bold tracking-wide">{top3.total_points} pts</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- 2. МОЙ РЕЗУЛЬТАТ (Sticky) --- */}
                    {currentUserEntry && (
                        <div className="sticky top-[80px] z-40 pb-2 bg-[#141414]">
                            <div className="leaderboard-card h-[54px] w-full flex items-center justify-between px-4 relative overflow-hidden shadow-lg">
                                {/* Акцентная подсветка для себя */}
                                <div className="absolute inset-0 bg-[#00B2FF]/5 pointer-events-none" />
                                
                                <div className="flex items-center gap-3 relative z-10">
                                    <span className="text-[#00B2FF] font-bold text-sm w-6 text-center">
                                        #{currentUserEntry.rank}
                                    </span>
                                    <Avatar user={currentUserEntry} size="sm" rank={currentUserEntry.rank} />
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[13px] font-bold text-white leading-tight">
                                            {currentUserEntry.username} (Вы)
                                        </span>
                                        <span className="text-[10px] text-[#5F6067]">
                                            {currentUserEntry.correct_picks} угаданных
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right relative z-10">
                                    <span className="text-[#00B2FF] font-bold text-[16px]">
                                        {currentUserEntry.total_points}
                                    </span>
                                    <span className="text-[9px] text-[#5F6067] ml-1 uppercase">PTS</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- 3. СПИСОК ОСТАЛЬНЫХ --- */}
                    <div className="flex flex-col gap-2 relative z-10">
                        {restList.map((entry) => (
                            <div 
                                key={entry.user_id} 
                                className="leaderboard-card h-[50px] w-full flex items-center justify-between px-4"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-[#5F6067] font-bold text-xs w-6 text-center">
                                        {entry.rank}
                                    </span>
                                    {/* Аватарка чуть меньше для списка */}
                                    <Avatar user={entry} size="sm" />
                                    <span className="text-[13px] font-medium text-[#EBEBF5]">
                                        {entry.username}
                                    </span>
                                </div>

                                <div className="text-right">
                                    <span className="text-[#00B2FF] font-bold text-[14px]">
                                        {entry.total_points}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                </main>
            )}
        </div>
    );
}