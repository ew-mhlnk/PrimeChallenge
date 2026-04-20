'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import useSWR from 'swr';

// --- ТИПЫ ---
interface DailyLeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    total_points: number;
    correct_picks: number;
}

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const fetcher = async (url: string) => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
    const res = await fetch(url, { headers: { Authorization: initData || '' } });
    if (!res.ok) throw new Error('Failed to load');
    return res.json();
};

const getPremiumGradient = (id: number) => {
    const gradients = [
        'bg-gradient-to-br from-[#141E30] to-[#243B55]', 'bg-gradient-to-br from-[#232526] to-[#414345]', 
        'bg-gradient-to-br from-[#1e130c] to-[#9a8478]', 'bg-gradient-to-br from-[#000000] to-[#434343]', 
        'bg-gradient-to-br from-[#16222A] to-[#3A6073]', 'bg-gradient-to-br from-[#191654] to-[#43C6AC]', 
    ];
    return gradients[id % gradients.length];
};

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5" /></svg>);
const SearchIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>);

const Avatar = ({ user, size = 'md', rank = 0 }: { user?: DailyLeaderboardEntry, size?: 'sm'|'md'|'lg', rank?: number }) => {
    if (!user) return <div className="w-10 h-10 rounded-full bg-white/5" />;
    
    let sizeClass = 'w-12 h-12 text-sm';
    if (size === 'sm') sizeClass = 'w-10 h-10 text-xs';
    if (size === 'lg') sizeClass = 'w-16 h-16 text-lg';

    let ringColor = 'ring-white/10'; 
    if (rank === 1) ringColor = 'ring-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]'; 
    if (rank === 2) ringColor = 'ring-[#C0C0C0] shadow-[0_0_10px_rgba(192,192,192,0.2)]'; 
    if (rank === 3) ringColor = 'ring-[#CD7F32] shadow-[0_0_10px_rgba(205,127,50,0.2)]'; 

    return (
        <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white/90 ring-1 ${ringColor} ${getPremiumGradient(user.user_id)} relative z-10`}>
            {getInitials(user.username)}
        </div>
    );
};

export default function DailyLeaderboardPage() {
    const router = useRouter();
    const { impact } = useHapticFeedback();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // === ИЗМЕНЕНИЕ 1: Фильтр по умолчанию на MADRID ===
    const [filter, setFilter] = useState<'ALL' | 'MADRID'>('MADRID'); 

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            setCurrentUserId(window.Telegram.WebApp.initDataUnsafe?.user?.id || null);
        }
    },[]);

    // === ИЗМЕНЕНИЕ 2: Ищем слово Madrid в названии турнира ===
    const apiUrl = filter === 'ALL' 
        ? '/api/daily/leaderboard' 
        : '/api/daily/leaderboard?tournament_filter=Madrid'; 

    const { data: leaderboardData, isLoading } = useSWR<DailyLeaderboardEntry[]>(
        apiUrl, 
        fetcher,
        { revalidateOnFocus: false, dedupingInterval: 60000, keepPreviousData: true }
    );

    const fullList = leaderboardData ||[];
    const currentUserEntry = fullList.find(u => u.user_id === currentUserId);

    const filteredList = fullList.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const top1 = fullList.find(u => u.rank === 1);
    const top2 = fullList.find(u => u.rank === 2);
    const top3 = fullList.find(u => u.rank === 3);

    const showPodium = !searchQuery && fullList.length > 0;

    return (
        <div className="min-h-screen bg-[#141414] text-white pb-32">
            
            {/* HEADER */}
            <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-2 px-6 border-b border-white/5">
                <div className="relative flex items-center justify-center min-h-[40px] mb-3">
                    <button 
                        onClick={() => { impact('light'); router.back(); }} 
                        className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                    >
                        <BackIcon />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-[20px] font-bold text-white tracking-tight leading-none">Дейли Рейтинг</h1>
                        <span className="text-[10px] text-[#00B2FF] font-medium mt-0.5 tracking-wide uppercase">
                            {/* === ИЗМЕНЕНИЕ 3: Текст под заголовком === */}
                            {filter === 'ALL' ? 'Общий зачет' : 'Madrid Open'}
                        </span>
                    </div>
                </div>

                {/* TABS (Переключатель) */}
                <div className="flex bg-[#1C1C1E] p-1 rounded-[14px] border border-white/5 mb-3">
                     <button
                        onClick={() => { impact('light'); setFilter('MADRID'); }}
                        className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all ${
                            filter === 'MADRID' 
                            ? 'bg-[#2C2C2E] text-white shadow-md' 
                            : 'text-[#8E8E93] hover:text-white'
                        }`}
                    >
                        {/* === ИЗМЕНЕНИЕ 4: Название кнопки === */}
                        MADRID OPEN
                    </button>
                    <button
                        onClick={() => { impact('light'); setFilter('ALL'); }}
                        className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all ${
                            filter === 'ALL' 
                            ? 'bg-[#2C2C2E] text-white shadow-md' 
                            : 'text-[#8E8E93] hover:text-white'
                        }`}
                    >
                        ВЕСЬ СЕЗОН
                    </button>
                </div>

                {/* SEARCH BAR */}
                <div className="relative mb-2">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <SearchIcon />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Поиск игрока..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1C1C1E] border border-white/5 rounded-[14px] py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#5F6067] focus:outline-none focus:border-[#00B2FF]/50 transition-all"
                    />
                </div>
            </header>

            {isLoading && !leaderboardData ? (
                <div className="flex justify-center mt-20"><div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" /></div>
            ) : (
                <main className="px-4 mt-4 animate-fade-in">
                    
                    {/* PODIUM */}
                    {showPodium && (
                        <div className="relative w-full h-[260px] mt-2 mb-2">
                            <div className="absolute bottom-0 left-0 right-0 h-[140px] z-10 flex justify-center items-end">
                                <div className="relative w-full max-w-[380px] h-full">
                                    <Image src="/images/stand.png" alt="Podium" fill className="object-contain object-bottom" priority unoptimized />
                                </div>
                            </div>
                            {top2 && <div className="absolute bottom-[115px] left-[12%] flex flex-col items-center z-20 w-[80px]"><Avatar user={top2} size="md" rank={2} /><span className="text-[11px] font-semibold mt-1 text-gray-300 truncate w-full text-center">{top2.username}</span><span className="text-[9px] bg-black/40 px-1.5 rounded mt-0.5">#{top2.rank}</span></div>}
                            {top1 && <div className="absolute bottom-[150px] left-1/2 -translate-x-1/2 flex flex-col items-center z-30 w-[100px]"><div className="mb-1 text-[#FFD700] text-lg">👑</div><Avatar user={top1} size="lg" rank={1} /><span className="text-[13px] font-bold mt-1 text-white truncate w-full text-center">{top1.username}</span><span className="text-[10px] text-[#FFD700] bg-black/40 px-2 rounded mt-0.5 font-bold">{top1.total_points}</span></div>}
                            {top3 && <div className="absolute bottom-[95px] right-[12%] flex flex-col items-center z-20 w-[80px]"><Avatar user={top3} size="md" rank={3} /><span className="text-[11px] font-semibold mt-1 text-[#B87C59] truncate w-full text-center">{top3.username}</span><span className="text-[9px] bg-black/40 px-1.5 rounded mt-0.5">#{top3.rank}</span></div>}
                        </div>
                    )}

                    {/* MY RANK */}
                    {currentUserEntry && !searchQuery && (
                        <div className="sticky top-[180px] z-40 pb-2 bg-[#141414]">
                            <div className="leaderboard-card h-[54px] w-full flex items-center justify-between px-4 relative overflow-hidden shadow-lg border border-[#00B2FF]/30 rounded-[16px] bg-[#1C1C1E]">
                                <div className="absolute inset-0 bg-[#00B2FF]/5 pointer-events-none" />
                                <div className="flex items-center gap-3 relative z-10">
                                    <span className="text-[#00B2FF] font-bold text-sm w-6 text-center">#{currentUserEntry.rank}</span>
                                    <Avatar user={currentUserEntry} size="sm" rank={currentUserEntry.rank} />
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[13px] font-bold text-white leading-tight">{currentUserEntry.username} (Вы)</span>
                                        <span className="text-[10px] text-[#5F6067]">{currentUserEntry.correct_picks} угаданных</span>
                                    </div>
                                </div>
                                <span className="text-[#00B2FF] font-bold text-[16px] relative z-10">{currentUserEntry.total_points}</span>
                            </div>
                        </div>
                    )}

                    {/* LIST */}
                    <div className="flex flex-col gap-2 relative z-10">
                        {filteredList.length === 0 ? (
                            <div className="text-center text-[#5F6067] py-10">Никого не найдено</div>
                        ) : (
                            filteredList.map((entry) => (
                                <div key={entry.user_id} className="leaderboard-card h-[50px] w-full flex items-center justify-between px-4 bg-[#1C1C1E] rounded-[16px] border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold text-xs w-6 text-center ${entry.rank <= 3 ? 'text-[#FFD700]' : 'text-[#5F6067]'}`}>
                                            {entry.rank}
                                        </span>
                                        <Avatar user={entry} size="sm" rank={entry.rank} />
                                        <span className="text-[13px] font-medium text-[#EBEBF5]">{entry.username}</span>
                                    </div>
                                    <span className="text-white font-bold text-[14px]">{entry.total_points}</span>
                                </div>
                            ))
                        )}
                    </div>

                </main>
            )}
        </div>
    );
}
