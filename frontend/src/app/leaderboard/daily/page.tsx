'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import useSWR from 'swr';

// --- TYPES ---
interface DailyLeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    total_points: number;
    correct_picks: number;
}

// --- HELPERS ---
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

// --- PREMIUM GRADIENTS ---
const getPremiumGradient = (id: number) => {
    const gradients = [
        'from-[#141E30] via-[#1a2a40] to-[#243B55]',
        'from-[#232526] via-[#2d3133] to-[#414345]',
        'from-[#1e130c] via-[#4a3428] to-[#9a8478]',
        'from-[#0F2027] via-[#203A43] to-[#2C5364]',
        'from-[#16222A] via-[#264d61] to-[#3A6073]',
        'from-[#191654] via-[#2e5f7e] to-[#43C6AC]',
    ];
    return `bg-gradient-to-br ${gradients[id % gradients.length]}`;
};

const BackIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 19L8 12L15 5" />
    </svg>
);

const TrophyIcon = ({ className = "" }: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

export default function DailyLeaderboardPage() {
    const router = useRouter();
    const { impact } = useHapticFeedback();
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            setCurrentUserId(window.Telegram.WebApp.initDataUnsafe?.user?.id || null);
        }
    }, []);

    const { data: leaderboardData, error, isLoading } = useSWR<DailyLeaderboardEntry[]>(
        '/api/daily/leaderboard',
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
            keepPreviousData: true,
        }
    );

    const leaderboard = leaderboardData || [];
    const top1 = leaderboard.find(u => u.rank === 1);
    const top2 = leaderboard.find(u => u.rank === 2);
    const top3 = leaderboard.find(u => u.rank === 3);
    const currentUserEntry = leaderboard.find(u => u.user_id === currentUserId);

    // --- PREMIUM AVATAR COMPONENT ---
    const Avatar = ({ user, size = 'md', rank = 0, index = 0 }: { 
        user?: DailyLeaderboardEntry, 
        size?: 'sm'|'md'|'lg', 
        rank?: number,
        index?: number 
    }) => {
        if (!user) return <div className="w-10 h-10 rounded-full bg-white/5" />;
        
        let sizeClass = 'w-10 h-10 text-xs';
        if (size === 'md') sizeClass = 'w-12 h-12 text-sm';
        if (size === 'lg') sizeClass = 'w-16 h-16 text-lg';

        let ringColor = 'ring-white/10';
        let glowClass = '';
        
        if (rank === 1) {
            ringColor = 'ring-[#FFD700]';
            glowClass = 'shadow-[0_0_20px_rgba(255,215,0,0.4)]';
        }
        if (rank === 2) {
            ringColor = 'ring-[#C0C0C0]';
            glowClass = 'shadow-[0_0_15px_rgba(192,192,192,0.3)]';
        }
        if (rank === 3) {
            ringColor = 'ring-[#CD7F32]';
            glowClass = 'shadow-[0_0_15px_rgba(205,127,50,0.3)]';
        }

        return (
            <motion.div 
                className={`
                    ${sizeClass} rounded-full flex items-center justify-center 
                    font-bold text-white/90 ring-2 ${ringColor} ${glowClass}
                    ${getPremiumGradient(user.user_id)}
                    relative backdrop-blur-sm
                `}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                }}
                whileHover={{ 
                    scale: 1.05,
                    rotate: 5,
                    transition: { duration: 0.2 }
                }}
            >
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 + 0.3 }}
                >
                    {getInitials(user.username)}
                </motion.span>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#000000] via-[#0a0a0a] to-[#141414] text-white pb-32 relative overflow-hidden">
            
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00B2FF]/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-[120px]" />
            </div>

            {/* HEADER */}
            <motion.header 
                className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl pt-6 pb-4 px-6 border-b border-white/5"
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
                <div className="relative flex items-center justify-center min-h-[40px]">
                    <motion.button
                        onClick={() => { impact('light'); router.back(); }}
                        className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/80 backdrop-blur-md"
                        whileHover={{ 
                            scale: 1.05,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.15)',
                            x: -2
                        }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <BackIcon />
                    </motion.button>

                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="flex items-center gap-2"
                    >
                        <TrophyIcon className="stroke-[#FFD700]" />
                        <h1 className="text-[20px] font-bold text-white tracking-tight leading-none bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Дейли Рейтинг
                        </h1>
                    </motion.div>
                </div>
            </motion.header>

            {/* Loading State */}
            {isLoading && !leaderboardData ? (
                <motion.div 
                    className="flex justify-center mt-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <motion.div 
                        className="w-10 h-10 border-3 border-[#00B2FF] border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                </motion.div>
            ) : (
                <main className="px-4 mt-6 flex flex-col gap-4 relative z-10">
                    
                    {/* --- PODIUM (TOP 3) --- */}
                    {leaderboard.length > 0 && (
                        <motion.div 
                            className="relative w-full h-[280px] mt-2 mb-0"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            {/* Stand Image */}
                            <motion.div 
                                className="absolute bottom-0 left-0 right-0 h-[150px] z-10 flex justify-center items-end"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                            >
                                <div className="relative w-full max-w-[380px] h-full">
                                    <Image
                                        src="/images/stand.png"
                                        alt="Podium"
                                        fill
                                        className="object-contain object-bottom drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                                        priority
                                        quality={100}
                                        unoptimized
                                    />
                                </div>
                            </motion.div>

                            {/* 2nd PLACE */}
                            {top2 && (
                                <motion.div 
                                    className="absolute bottom-[125px] left-[12%] flex flex-col items-center z-20 w-[80px]"
                                    initial={{ opacity: 0, y: 50, x: -20 }}
                                    animate={{ opacity: 1, y: 0, x: 0 }}
                                    transition={{ delay: 0.6, duration: 0.6, type: "spring" }}
                                >
                                    <Avatar user={top2} size="md" rank={2} />
                                    <motion.span 
                                        className="text-[11px] font-semibold mt-1.5 text-gray-300 truncate w-full text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.9 }}
                                    >
                                        {top2.username}
                                    </motion.span>
                                </motion.div>
                            )}

                            {/* 1st PLACE */}
                            {top1 && (
                                <motion.div 
                                    className="absolute bottom-[160px] left-1/2 -translate-x-1/2 flex flex-col items-center z-30 w-[100px]"
                                    initial={{ opacity: 0, y: 50, scale: 0.5 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: 0.4, duration: 0.8, type: "spring", stiffness: 150 }}
                                >
                                    <motion.div 
                                        className="mb-1 text-[22px]"
                                        animate={{ 
                                            y: [0, -5, 0],
                                            rotate: [-5, 5, -5]
                                        }}
                                        transition={{ 
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        👑
                                    </motion.div>
                                    <Avatar user={top1} size="lg" rank={1} />
                                    <motion.span 
                                        className="text-[13px] font-bold mt-1.5 text-white truncate w-full text-center drop-shadow-[0_2px_12px_rgba(255,215,0,0.4)]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.9 }}
                                    >
                                        {top1.username}
                                    </motion.span>
                                </motion.div>
                            )}

                            {/* 3rd PLACE */}
                            {top3 && (
                                <motion.div 
                                    className="absolute bottom-[105px] right-[12%] flex flex-col items-center z-20 w-[80px]"
                                    initial={{ opacity: 0, y: 50, x: 20 }}
                                    animate={{ opacity: 1, y: 0, x: 0 }}
                                    transition={{ delay: 0.8, duration: 0.6, type: "spring" }}
                                >
                                    <Avatar user={top3} size="md" rank={3} />
                                    <motion.span 
                                        className="text-[11px] font-semibold mt-1.5 text-[#B87C59] truncate w-full text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1.1 }}
                                    >
                                        {top3.username}
                                    </motion.span>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* --- CURRENT USER ENTRY (Sticky) --- */}
                    <AnimatePresence>
                        {currentUserEntry && (
                            <motion.div 
                                className="sticky top-[80px] z-40 pb-2"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.2, duration: 0.5 }}
                            >
                                <div className="h-[54px] w-full flex items-center justify-between px-4 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00B2FF]/10 via-[#00B2FF]/5 to-transparent border border-[#00B2FF]/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,178,255,0.15)]">
                                    <div className="absolute inset-0 bg-gradient-to-r from-[#00B2FF]/5 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 opacity-30">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,178,255,0.1),transparent_70%)]" />
                                    </div>

                                    <div className="flex items-center gap-3 relative z-10">
                                        <motion.span 
                                            className="text-[#00B2FF] font-bold text-sm w-6 text-center"
                                            animate={{ 
                                                textShadow: [
                                                    '0 0 10px rgba(0,178,255,0.3)',
                                                    '0 0 20px rgba(0,178,255,0.6)',
                                                    '0 0 10px rgba(0,178,255,0.3)'
                                                ]
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        >
                                            #{currentUserEntry.rank}
                                        </motion.span>
                                        <Avatar user={currentUserEntry} size="sm" rank={currentUserEntry.rank} />
                                        <div className="flex flex-col justify-center">
                                            <span className="text-[13px] font-bold text-white leading-tight">
                                                {currentUserEntry.username} <span className="text-[#00B2FF]">(Вы)</span>
                                            </span>
                                            <span className="text-[10px] text-white/50">
                                                {currentUserEntry.correct_picks} угаданных
                                            </span>
                                        </div>
                                    </div>

                                    <motion.div 
                                        className="text-right relative z-10"
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        <span className="text-[#00B2FF] font-bold text-[17px] drop-shadow-[0_0_10px_rgba(0,178,255,0.5)]">
                                            {currentUserEntry.total_points}
                                        </span>
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* --- LEADERBOARD LIST --- */}
                    <motion.div 
                        className="flex flex-col gap-2 relative z-10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.3, duration: 0.5 }}
                    >
                        {leaderboard.map((entry, index) => {
                            let rankColor = "text-white/40";
                            let rankGlow = "";
                            
                            if (entry.rank === 1) {
                                rankColor = "text-[#FFD700]";
                                rankGlow = "drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]";
                            }
                            if (entry.rank === 2) {
                                rankColor = "text-[#C0C0C0]";
                                rankGlow = "drop-shadow-[0_0_6px_rgba(192,192,192,0.3)]";
                            }
                            if (entry.rank === 3) {
                                rankColor = "text-[#CD7F32]";
                                rankGlow = "drop-shadow-[0_0_6px_rgba(205,127,50,0.3)]";
                            }

                            return (
                                <motion.div
                                    key={entry.user_id}
                                    className="h-[50px] w-full flex items-center justify-between px-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300 group relative overflow-hidden"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ 
                                        delay: 1.3 + (index * 0.03),
                                        duration: 0.5,
                                        ease: [0.34, 1.56, 0.64, 1]
                                    }}
                                    whileHover={{ 
                                        scale: 1.01,
                                        transition: { duration: 0.2 }
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    <div className="flex items-center gap-3 relative z-10">
                                        <span className={`${rankColor} ${rankGlow} font-bold text-xs w-6 text-center transition-all duration-300`}>
                                            {entry.rank}
                                        </span>
                                        <Avatar user={entry} size="sm" rank={entry.rank} index={index} />
                                        <span className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors duration-300">
                                            {entry.username}
                                        </span>
                                    </div>

                                    <div className="text-right relative z-10">
                                        <span className="text-[#00B2FF] font-bold text-[14px] drop-shadow-[0_0_8px_rgba(0,178,255,0.2)]">
                                            {entry.total_points}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>

                </main>
            )}
        </div>
    );
}