'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileContext } from '@/context/ProfileContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { TournamentHistoryRow } from '@/types';

// --- ИКОНКИ ---
const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>);
const StatsIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20V16"/></svg>);
const SparkleIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/><path d="M19 3l.75 2.75L22 6.5l-2.25.75L19 10l-.75-2.75L16 6.5l2.25-.75L19 3z"/></svg>);

// --- КОМПОНЕНТЫ ---

const BentoCard = ({ children, className, onClick, gradient }: { children: React.ReactNode, className?: string, onClick?: () => void, gradient?: string }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileTap={onClick ? { scale: 0.98 } : {}}
            onClick={onClick}
            className={`
                relative overflow-hidden rounded-[24px] 
                border border-white/5
                shadow-lg
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
            style={{ 
                background: gradient || 'linear-gradient(135deg, #1C1C1E 0%, #141414 100%)'
            }}
        >
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </motion.div>
    );
};

const StatsBlock = ({ stats }: { stats: any }) => {
    const overall = stats.cumulative.find((s: any) => s.category === 'Overall') || {};
    
    return (
        <BentoCard 
            className="col-span-2 p-5 flex flex-col justify-between min-h-[150px]" 
            gradient="linear-gradient(135deg, #003355 0%, #001a2e 100%)"
        >
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="text-[#A0D9FF]"><SparkleIcon /></div>
                        <h3 className="text-[#A0D9FF] text-[11px] font-bold uppercase tracking-widest">Моя статистика</h3>
                    </div>
                    <h2 className="text-white text-2xl font-black leading-none">
                        Общая
                    </h2>
                </div>
                <div className="p-2 bg-white/10 rounded-xl text-white/80">
                    <StatsIcon />
                </div>
            </div>

            <div className="flex items-end gap-6 mt-4">
                {[
                    { label: 'Ранг', value: `#${overall.rank || '-'}`, color: 'text-white' },
                    { label: 'Очки', value: overall.points || 0, color: 'text-[#00D9FF]' },
                    { label: 'Точность', value: overall.percent_correct || '0%', color: 'text-[#30E566]' }
                ].map((stat, idx) => (
                    <div key={idx}>
                        <span className="text-[10px] text-white/60 block uppercase mb-0.5 font-semibold">
                            {stat.label}
                        </span>
                        <span className={`text-[20px] font-black ${stat.color}`}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>
        </BentoCard>
    );
};

// NavCard с опциональной иконкой
const NavCard = ({ title, sub, icon: Icon, href, gradient }: { title: string, sub: string, icon?: any, href: string, gradient: string }) => {
    const { impact } = useHapticFeedback();
    const router = useRouter();

    return (
        <BentoCard 
            onClick={() => { impact('light'); router.push(href); }}
            className="col-span-1 p-4 flex flex-col justify-between aspect-square relative"
            gradient={gradient}
        >
            {/* Рендерим иконку только если она передана */}
            {Icon && (
                <div className="absolute top-4 right-4 text-white/40">
                    <Icon />
                </div>
            )}
            
            <div />

            <div className="relative z-10 mt-6">
                <span className="text-[17px] font-black text-white leading-tight block mb-1 tracking-tight">
                    {title}
                </span>
                <span className="text-[11px] text-white/60 font-medium block leading-tight">
                    {sub}
                </span>
            </div>
        </BentoCard>
    );
};

const FilterPill = ({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) => {
    const { impact } = useHapticFeedback();
    return (
        <button 
            onClick={() => { impact('light'); onClick(); }} 
            className={`
                relative px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-200
                ${isActive 
                    ? 'bg-[#007AFF] text-white' 
                    : 'bg-white/5 text-[#8E8E93] border border-white/10'
                }
            `}
        >
            {label}
        </button>
    );
};

export default function ProfilePage() {
  const router = useRouter();
  const { impact } = useHapticFeedback();
  
  const { stats, isLoading, error } = useProfileContext();
  const [historyTag, setHistoryTag] = useState<string>('ВСЕ');

  const filteredHistory = stats?.history.filter((item: TournamentHistoryRow) => {
      if (historyTag === 'ВСЕ') return true;
      return item.tag === historyTag;
  }) || [];

  if (isLoading) {
    return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-[#5F6067]">Загрузка...</div>;
  }
  
  if (error || !stats) {
    return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-red-500">Ошибка: {error}</div>;
  }

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
            <h1 className="text-[20px] font-bold text-white tracking-tight leading-none">Профиль</h1>
        </div>
      </header>

      <main className="px-4 mt-6">
        <div className="mb-6 px-1">
            <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">
                Привет, <span className="text-[#00B2FF]">{stats.name}</span>
            </h1>
            <p className="text-[#8E8E93] text-[13px] mt-1 font-medium">Твоя статистика и достижения</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
            
            {/* 1. СТАТИСТИКА */}
            <StatsBlock stats={stats} />

            {/* 2. ДЕЙЛИ (КАПС, без иконки) */}
            <NavCard 
                title="ДЕЙЛИ РЕЙТИНГ" 
                sub="Рейтинг дня"
                // icon убран
                href="/leaderboard/daily"
                gradient="linear-gradient(135deg, #7a2e19 0%, #3d1205 100%)" 
            />

            {/* 3. ТУРНИРЫ (КАПС, без иконки) */}
            <NavCard 
                title="ТОП ТУРНИРОВ" 
                sub="Общий рейтинг"
                // icon убран
                href="/leaderboard/tournaments"
                gradient="linear-gradient(135deg, #7a5c19 0%, #3d2b05 100%)" 
            />
            
            {/* 4. МОИ ТУРНИРЫ */}
            <BentoCard 
                className="col-span-2 p-5 min-h-[300px] flex flex-col" 
                gradient="linear-gradient(180deg, #1C1C1E 0%, #121212 100%)"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-[16px]">Мои турниры</h3>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-hide mb-2">
                    {['ВСЕ', 'ATP', 'WTA', 'ТБШ'].map(tag => (
                        <FilterPill key={tag} label={tag} isActive={historyTag === tag} onClick={() => setHistoryTag(tag)} />
                    ))}
                </div>

                <div className="flex flex-col gap-2 mt-1">
                    <AnimatePresence mode="popLayout">
                        {filteredHistory.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-10 text-center text-[#5F6067] text-sm"
                            >
                                История пуста
                            </motion.div>
                        ) : (
                            filteredHistory.map((row) => (
                                <Link href={`/tournament/${row.tournament_id}`} key={row.tournament_id} onClick={() => impact('light')}>
                                    <motion.div 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="bg-[#2C2C2E]/60 rounded-[16px] p-3 border border-white/5 flex justify-between items-center"
                                    >
                                        <div className="flex flex-col">
                                            <h4 className="font-bold text-[14px] text-white leading-tight mb-1">{row.name}</h4>
                                            <div className="flex gap-2 text-[11px] text-[#8E8E93]">
                                                <span className="text-[#00B2FF]">#{row.rank}</span>
                                                <span>•</span>
                                                <span>{row.points} pts</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[13px] font-bold text-[#32D74B]">{row.percent_correct}</span>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </BentoCard>

            {/* 5. ПРАВИЛА (Без иконки, крупнее текст) */}
            <BentoCard 
                onClick={() => { impact('light'); router.push('/rules'); }}
                className="col-span-2 p-5 flex items-center justify-between"
                gradient="linear-gradient(90deg, #1C1C1E 0%, #232325 100%)"
            >
                <div className="flex flex-col w-full">
                    <span className="text-[18px] font-black text-white mb-1">Правила игры</span>
                    <span className="text-[11px] text-[#8E8E93]">Как считаются очки?</span>
                </div>
            </BentoCard>

        </div>
      </main>
    </div>
  );
}