'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import useSWR from 'swr';
import Link from 'next/link'; // <--- Импорт Link
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { LeaderboardEntry, Tournament } from '@/types';

// --- ХЕЛПЕРЫ ---
const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const fetcher = async (url: string) => {
    let attempts = 0;
    while (typeof window !== 'undefined' && !window.Telegram?.WebApp?.initData && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
    
    const res = await fetch(url, {
        headers: { Authorization: initData || '' }
    });
    if (!res.ok) throw new Error('Failed to load');
    return res.json();
};

const getPremiumGradient = (id: number) => {
    const gradients = [
        'bg-gradient-to-br from-[#141E30] to-[#243B55]', 
        'bg-gradient-to-br from-[#232526] to-[#414345]', 
        'bg-gradient-to-br from-[#1e130c] to-[#9a8478]', 
        'bg-gradient-to-br from-[#000000] to-[#434343]', 
        'bg-gradient-to-br from-[#16222A] to-[#3A6073]', 
        'bg-gradient-to-br from-[#191654] to-[#43C6AC]', 
    ];
    return gradients[id % gradients.length];
};

const BackIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5" /></svg>
);

const Avatar = ({ user, size = 'md', rank = 0 }: { user?: LeaderboardEntry, size?: 'sm'|'md'|'lg', rank?: number }) => {
    if (!user) return <div className="w-10 h-10 rounded-full bg-white/5" />;
    
    let sizeClass = 'w-10 h-10 text-xs'; 
    if (size === 'md') sizeClass = 'w-12 h-12 text-sm';
    if (size === 'lg') sizeClass = 'w-16 h-16 text-lg';

    let ringColor = 'ring-white/10'; 
    if (rank === 1) ringColor = 'ring-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]'; 
    if (rank === 2) ringColor = 'ring-[#C0C0C0] shadow-[0_0_10px_rgba(192,192,192,0.2)]'; 
    if (rank === 3) ringColor = 'ring-[#CD7F32] shadow-[0_0_10px_rgba(205,127,50,0.2)]'; 

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

export default function TournamentLeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { impact } = useHapticFeedback();
  
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
          setCurrentUserId(window.Telegram.WebApp.initDataUnsafe.user.id);
      }
  }, []);

  const { data: leaderboardData, isLoading: lbLoading } = useSWR<LeaderboardEntry[]>(
      `/api/leaderboard/tournament/${id}`, 
      fetcher,
      { dedupingInterval: 60000, revalidateOnFocus: false } 
  );

  const { data: tournamentInfo, isLoading: infoLoading } = useSWR<Tournament>(
      `/api/tournament/${id}`,
      fetcher,
      { dedupingInterval: 300000, revalidateOnFocus: false } 
  );

  const leaderboard = leaderboardData || [];
  const isLoading = lbLoading || infoLoading;

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const currentUserEntry = leaderboard.find(u => u.user_id === currentUserId);

  // --- ЛОГИКА ДОСТУПА К ПРОСМОТРУ ---
  // Смотреть можно только если турнир ЗАКРЫТ для приема прогнозов или ЗАВЕРШЕН
  const canViewPicks = tournamentInfo?.status === 'CLOSED' || tournamentInfo?.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-[#141414] text-white pb-32">
        
        <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-6 pb-4 px-6 border-b border-white/5">
            <div className="relative flex items-center justify-center min-h-[40px]">
                <button 
                    onClick={() => { impact('light'); router.back(); }} 
                    className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/5 active:scale-90 transition-transform"
                >
                    <BackIcon />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-[18px] font-bold text-white tracking-tight leading-none text-center max-w-[200px] truncate">
                        {tournamentInfo?.name || '...'}
                    </h1>
                    <span className="text-[10px] text-[#8E8E93] mt-0.5">Турнирный рейтинг</span>
                </div>
            </div>
        </header>

        {isLoading && !leaderboardData ? (
            <div className="flex justify-center mt-20">
                <div className="w-8 h-8 border-2 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
            </div>
        ) : leaderboard.length === 0 ? (
            <div className="text-center text-[#5F6067] mt-20 text-sm">Пока нет участников</div>
        ) : (
            <main className="px-4 mt-6 flex flex-col gap-4 animate-fade-in">
                
                {/* ПОДИУМ */}
                <div className="relative w-full h-[280px] mt-2 mb-0">
                    <div className="absolute bottom-0 left-0 right-0 h-[150px] z-10 flex justify-center items-end">
                        <div className="relative w-full max-w-[380px] h-full">
                            <Image src="/images/stand.png" alt="Podium" fill className="object-contain object-bottom" priority quality={100} unoptimized />
                        </div>
                    </div>
                    {/* 2 МЕСТО */}
                    {top2 && (
                        <div className="absolute bottom-[125px] left-[12%] flex flex-col items-center z-20 w-[80px]">
                            <Avatar user={top2} size="md" rank={top2.rank} />
                            <span className="text-[11px] font-semibold mt-1.5 text-gray-300 truncate w-full text-center drop-shadow-md">{top2.username}</span>
                            <span className="text-[9px] text-gray-400 bg-black/40 px-1.5 rounded mt-0.5">#{top2.rank}</span>
                        </div>
                    )}
                    {/* 1 МЕСТО */}
                    {top1 && (
                        <div className="absolute bottom-[160px] left-1/2 -translate-x-1/2 flex flex-col items-center z-30 w-[100px]">
                            <div className="mb-1 text-[#FFD700] text-lg drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">👑</div>
                            <Avatar user={top1} size="lg" rank={top1.rank} />
                            <span className="text-[13px] font-bold mt-1.5 text-white truncate w-full text-center drop-shadow-md">{top1.username}</span>
                            <span className="text-[10px] text-[#FFD700] bg-black/40 px-2 rounded mt-0.5 font-bold">{top1.score} pts</span>
                        </div>
                    )}
                    {/* 3 МЕСТО */}
                    {top3 && (
                        <div className="absolute bottom-[105px] right-[12%] flex flex-col items-center z-20 w-[80px]">
                            <Avatar user={top3} size="md" rank={top3.rank} />
                            <span className="text-[11px] font-semibold mt-1.5 text-[#B87C59] truncate w-full text-center drop-shadow-md">{top3.username}</span>
                            <span className="text-[9px] text-[#B87C59] bg-black/40 px-1.5 rounded mt-0.5">#{top3.rank}</span>
                        </div>
                    )}
                </div>

                {/* МОЙ РЕЙТИНГ */}
                {currentUserEntry && (
                    <div className="sticky top-[80px] z-40 pb-2 bg-[#141414]">
                        <div className="leaderboard-card h-[60px] w-full flex items-center justify-between px-4 relative overflow-hidden shadow-lg border border-[#00B2FF]/30">
                            <div className="absolute inset-0 bg-[#00B2FF]/5 pointer-events-none" />
                            <div className="flex items-center gap-3 relative z-10">
                                <span className="text-[#00B2FF] font-bold text-sm w-6 text-center">#{currentUserEntry.rank}</span>
                                <Avatar user={currentUserEntry} size="sm" rank={currentUserEntry.rank} />
                                <div className="flex flex-col justify-center">
                                    <span className="text-[13px] font-bold text-white leading-tight">{currentUserEntry.username} (Вы)</span>
                                    <span className="text-[10px] text-[#5F6067]">{currentUserEntry.correct_picks} угаданных</span>
                                </div>
                            </div>
                            <div className="text-right relative z-10">
                                <span className="text-[#00B2FF] font-bold text-[16px]">{currentUserEntry.score}</span>
                                <span className="text-[9px] text-[#5F6067] block uppercase">pts</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* СПИСОК */}
                <div className="flex flex-col gap-2 relative z-10">
                    {leaderboard.map((entry) => {
                        let rankColor = "text-[#5F6067]";
                        if (entry.rank === 1) rankColor = "text-[#FFD700]";
                        if (entry.rank === 2) rankColor = "text-[#C0C0C0]";
                        if (entry.rank === 3) rankColor = "text-[#CD7F32]";

                        // Внутренности карточки
                        const CardContent = (
                            <div className="leaderboard-card h-[54px] w-full flex items-center justify-between px-4 transition-transform active:scale-[0.99]">
                                <div className="flex items-center gap-3">
                                    <span className={`${rankColor} font-bold text-sm w-6 text-center`}>{entry.rank}</span>
                                    <Avatar user={entry} size="sm" rank={entry.rank} />
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-medium text-[#EBEBF5]">{entry.username}</span>
                                        <span className="text-[10px] text-[#5F6067]">{entry.correct_picks} верных</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-bold text-[15px]">{entry.score}</span>
                                </div>
                            </div>
                        );

                        // УСЛОВИЕ:
                        // 1. Турнир должен быть CLOSED или COMPLETED
                        // 2. Это не я сам (свой профиль кликать не обязательно, но можно разрешить)
                        // Если все ок - заворачиваем в LINK. Если нет - просто DIV.
                        if (canViewPicks && entry.user_id !== currentUserId) {
                            return (
                                <Link 
                                    key={entry.user_id} 
                                    href={`/tournament/${id}/user/${entry.user_id}`}
                                    onClick={() => impact('light')}
                                >
                                    {CardContent}
                                </Link>
                            );
                        }

                        // Просто карточка (нельзя нажать)
                        return <div key={entry.user_id}>{CardContent}</div>;
                    })}
                </div>
            </main>
        )}
    </div>
  );
}