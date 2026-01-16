'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import useSWR from 'swr';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { LeaderboardEntry } from '@/types';

// --- ХЕЛПЕРЫ ---
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
    const gradients = ['bg-gradient-to-br from-[#141E30] to-[#243B55]', 'bg-gradient-to-br from-[#232526] to-[#414345]', 'bg-gradient-to-br from-[#1e130c] to-[#9a8478]'];
    return gradients[id % gradients.length];
};

const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5" /></svg>);

const Avatar = ({ user, size = 'md', rank = 0 }: { user?: LeaderboardEntry, size?: 'sm'|'md'|'lg', rank?: number }) => {
    if (!user) return <div className="w-10 h-10 rounded-full bg-white/5" />;
    let sizeClass = size === 'lg' ? 'w-16 h-16 text-lg' : size === 'md' ? 'w-12 h-12 text-sm' : 'w-10 h-10 text-xs';
    let ringColor = rank === 1 ? 'ring-[#FFD700]' : rank === 2 ? 'ring-[#C0C0C0]' : rank === 3 ? 'ring-[#CD7F32]' : 'ring-white/10';
    return (
        <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white/90 ring-1 ${ringColor} ${getPremiumGradient(user.user_id)} relative z-10`}>
            {getInitials(user.username)}
        </div>
    );
};

function GrandSlamContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { impact } = useHapticFeedback();

    // Получаем ID турниров из URL
    const idATP = searchParams.get('atp');
    const idWTA = searchParams.get('wta');
    const name = searchParams.get('name') || 'Grand Slam';

    // По умолчанию открываем "ВСЕГО", но порядок кнопок будет другим
    const [filter, setFilter] = useState<'ALL' | 'ATP' | 'WTA'>('ALL');
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') setCurrentUserId(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null);
    }, []);

    // ОПРЕДЕЛЯЕМ URL ДЛЯ ЗАГРУЗКИ
    let apiUrl = '';
    if (filter === 'ALL') apiUrl = `/api/leaderboard/combined?ids=${idATP},${idWTA}`;
    else if (filter === 'ATP') apiUrl = `/api/leaderboard/tournament/${idATP}`;
    else apiUrl = `/api/leaderboard/tournament/${idWTA}`;

    const { data: leaderboard, isLoading } = useSWR<LeaderboardEntry[]>(
        (idATP && idWTA) ? apiUrl : null,
        fetcher,
        { dedupingInterval: 60000, keepPreviousData: true }
    );

    const list = leaderboard || [];
    
    // ЛОГИКА ОТОБРАЖЕНИЯ ПОДИУМА
    // Если список пуст ИЛИ у лидера (1 место) 0 очков -> Подиум скрыт
    const showPodium = list.length > 0 && list[0].score > 0;

    const top1 = list.find(u => u.rank === 1);
    const top2 = list.find(u => u.rank === 2);
    const top3 = list.find(u => u.rank === 3);
    const currentUserEntry = list.find(u => u.user_id === currentUserId);

    return (
        <div className="min-h-screen bg-[#141414] text-white pb-32">
            {/* HEADER */}
            <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-2 px-6 border-b border-white/5">
                <div className="relative flex items-center justify-center min-h-[40px] mb-4">
                    <button onClick={() => { impact('light'); router.back(); }} className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform">
                        <BackIcon />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-[18px] font-bold text-white text-center max-w-[200px] truncate">{name}</h1>
                        <span className="text-[10px] text-[#FFD700] font-bold tracking-wide">GRAND SLAM</span>
                    </div>
                </div>

                {/* TABS (НОВЫЙ ПОРЯДОК: ATP -> WTA -> ВСЕГО) */}
                <div className="flex bg-[#1C1C1E] p-1 rounded-[14px] border border-white/5">
                    {[
                        { key: 'ATP', label: 'M (ATP)' },
                        { key: 'WTA', label: 'Ж (WTA)' },
                        { key: 'ALL', label: 'ВСЕГО' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => { impact('light'); setFilter(tab.key as any); }}
                            className={`flex-1 py-2 text-[12px] font-bold rounded-[10px] transition-all ${
                                filter === tab.key 
                                ? 'bg-[#2C2C2E] text-white shadow-md' 
                                : 'text-[#8E8E93] hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* CONTENT */}
            <main className="px-4 mt-4 animate-fade-in">
                {isLoading && !leaderboard ? (
                    <div className="flex justify-center mt-20"><div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" /></div>
                ) : list.length === 0 ? (
                    <div className="text-center text-[#5F6067] mt-20 text-sm">Нет данных</div>
                ) : (
                    <>
                        {/* PODIUM (Только если есть очки > 0) */}
                        {showPodium && (
                            <div className="relative w-full h-[260px] mt-2 mb-2">
                                <div className="absolute bottom-0 left-0 right-0 h-[140px] z-10 flex justify-center items-end">
                                    <div className="relative w-full max-w-[380px] h-full">
                                        <Image src="/images/stand.png" alt="Podium" fill className="object-contain object-bottom" priority unoptimized />
                                    </div>
                                </div>
                                {top2 && <div className="absolute bottom-[115px] left-[12%] flex flex-col items-center z-20 w-[80px]"><Avatar user={top2} size="md" rank={2} /><span className="text-[11px] font-semibold mt-1 text-gray-300 truncate w-full text-center">{top2.username}</span><span className="text-[9px] bg-black/40 px-1.5 rounded mt-0.5">#{top2.rank}</span></div>}
                                {top1 && <div className="absolute bottom-[150px] left-1/2 -translate-x-1/2 flex flex-col items-center z-30 w-[100px]"><div className="mb-1 text-[#FFD700] text-lg">👑</div><Avatar user={top1} size="lg" rank={1} /><span className="text-[13px] font-bold mt-1 text-white truncate w-full text-center">{top1.username}</span><span className="text-[10px] text-[#FFD700] bg-black/40 px-2 rounded mt-0.5 font-bold">{top1.score} pts</span></div>}
                                {top3 && <div className="absolute bottom-[95px] right-[12%] flex flex-col items-center z-20 w-[80px]"><Avatar user={top3} size="md" rank={3} /><span className="text-[11px] font-semibold mt-1 text-[#B87C59] truncate w-full text-center">{top3.username}</span><span className="text-[9px] bg-black/40 px-1.5 rounded mt-0.5">#{top3.rank}</span></div>}
                            </div>
                        )}

                        {/* Если подиум скрыт, добавляем отступ сверху, чтобы список не прилип к шапке */}
                        {!showPodium && <div className="h-4" />}

                        {/* MY RANK */}
                        {currentUserEntry && (
                            <div className={`sticky ${showPodium ? 'top-[138px]' : 'top-[138px]'} z-40 pb-2 bg-[#141414]`}>
                                <div className="h-[54px] w-full flex items-center justify-between px-4 bg-[#1C1C1E] border border-[#00B2FF]/30 rounded-[16px] shadow-lg relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[#00B2FF]/5 pointer-events-none" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <span className="text-[#00B2FF] font-bold text-sm w-6 text-center">#{currentUserEntry.rank}</span>
                                        <Avatar user={currentUserEntry} size="sm" rank={currentUserEntry.rank} />
                                        <span className="text-[13px] font-bold text-white">{currentUserEntry.username} (Вы)</span>
                                    </div>
                                    <span className="text-[#00B2FF] font-bold text-[16px] relative z-10">{currentUserEntry.score} pts</span>
                                </div>
                            </div>
                        )}

                        {/* LIST */}
                        <div className="flex flex-col gap-2 relative z-10">
                            {list.map((entry) => (
                                <div key={entry.user_id} className="h-[50px] w-full flex items-center justify-between px-4 bg-[#1C1C1E] rounded-[16px] border border-white/5">
                                    <div className="flex items-center gap-3">
                                        {/* Если подиум скрыт, цвета рангов не делаем золотыми */}
                                        <span className={`font-bold text-xs w-6 text-center ${showPodium && entry.rank <= 3 ? 'text-[#FFD700]' : 'text-[#5F6067]'}`}>{entry.rank}</span>
                                        <Avatar user={entry} size="sm" rank={entry.rank} />
                                        <span className="text-[13px] font-medium text-[#EBEBF5]">{entry.username}</span>
                                    </div>
                                    <span className="text-white font-bold text-[14px]">{entry.score}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default function GrandSlamPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#141414]" />}>
            <GrandSlamContent />
        </Suspense>
    );
}