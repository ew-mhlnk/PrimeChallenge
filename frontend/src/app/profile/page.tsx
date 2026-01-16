'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useProfileContext } from '@/context/ProfileContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { TournamentHistoryRow } from '@/types';

// --- ИКОНКИ ---
const BackIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19L8 12L15 5"/></svg>);
const StatsIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20V16"/></svg>);
const CupIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>);
const FireIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-3 3.5-3 6 0 1.5 1 3 1 3s-3-1-3-4c0 0-3 2-3 6 0 4.418 3.582 8 8 8s8-3.582 8-8c0-4-3-6-3-6s0 3 0 4c0 0 1-1.5 1-3 0-2.5-3-6-3-6z"/></svg>);
const BookIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>);

// --- КОМПОНЕНТЫ ---

// 1. Карточка БЕНТО (Обертка)
const BentoCard = ({ children, className, onClick, gradient }: { children: React.ReactNode, className?: string, onClick?: () => void, gradient?: string }) => {
    return (
        <motion.div 
            whileTap={onClick ? { scale: 0.98 } : {}}
            onClick={onClick}
            className={`
                relative overflow-hidden rounded-[24px] border border-white/5 
                shadow-lg backdrop-blur-sm ${className}
            `}
        >
            {/* Градиент фона */}
            <div 
                className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
                style={{ background: gradient || 'linear-gradient(135deg, #2C2C2E 0%, #1C1C1E 100%)' }} 
            />
            
            {/* Контент */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </motion.div>
    );
};

// 2. Статистика (Главный блок)
const StatsBlock = ({ stats }: { stats: any }) => {
    const overall = stats.cumulative.find((s: any) => s.category === 'Overall') || {};
    
    return (
        <BentoCard className="col-span-2 p-5 flex flex-col justify-between min-h-[140px]" gradient="linear-gradient(135deg, #004d7a 0%, #000000 100%)">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider mb-1">Моя статистика</h3>
                    <h2 className="text-white text-2xl font-bold leading-none">Overall</h2>
                </div>
                <div className="p-2 bg-white/10 rounded-full text-white/80">
                    <StatsIcon />
                </div>
            </div>

            <div className="flex items-end gap-6 mt-4">
                <div>
                    <span className="text-[10px] text-[#8E8E93] block uppercase mb-0.5">Ранг</span>
                    <span className="text-[20px] font-bold text-white">#{overall.rank || '-'}</span>
                </div>
                <div>
                    <span className="text-[10px] text-[#8E8E93] block uppercase mb-0.5">Очки</span>
                    <span className="text-[20px] font-bold text-[#00B2FF]">{overall.points || 0}</span>
                </div>
                <div>
                    <span className="text-[10px] text-[#8E8E93] block uppercase mb-0.5">Точность</span>
                    <span className="text-[20px] font-bold text-[#32D74B]">{overall.percent_correct || '0%'}</span>
                </div>
            </div>
        </BentoCard>
    );
};

// 3. Маленькая навигационная карточка
const NavCard = ({ title, sub, icon: Icon, href, gradient }: { title: string, sub: string, icon: any, href: string, gradient: string }) => {
    const { impact } = useHapticFeedback();
    const router = useRouter();

    return (
        <BentoCard 
            onClick={() => { impact('light'); router.push(href); }}
            className="col-span-1 p-4 flex flex-col justify-between aspect-square"
            gradient={gradient}
        >
            <div className="flex justify-end text-white/60">
                <Icon />
            </div>
            <div>
                <span className="text-[10px] text-white/50 font-medium block leading-tight mb-1">{sub}</span>
                <span className="text-[14px] font-bold text-white leading-tight block">{title}</span>
            </div>
        </BentoCard>
    );
};

// 4. Фильтр (Pills)
const FilterPill = ({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) => {
    const { impact } = useHapticFeedback();
    return (
        <button 
            onClick={() => { impact('light'); onClick(); }} 
            className={`
                px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300
                ${isActive ? 'bg-[#007AFF] text-white shadow-md' : 'bg-[#2C2C2E] text-[#8E8E93]'}
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

  // Фильтрация истории
  const filteredHistory = stats?.history.filter((item: TournamentHistoryRow) => {
      if (historyTag === 'ВСЕ') return true;
      return item.tag === historyTag;
  }) || [];

  if (isLoading) return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-[#5F6067]">Загрузка профиля...</div>;
  if (error || !stats) return <div className="min-h-screen bg-[#141414] flex items-center justify-center text-red-500">Ошибка: {error}</div>;

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
                Профиль
            </h1>
        </div>
      </header>

      <main className="px-4 mt-6 animate-fade-in">
        
        {/* ПРИВЕТСТВИЕ */}
        <div className="mb-6 px-1">
            <h1 className="text-[28px] font-bold text-white leading-tight">
                Привет, <span className="text-[#00B2FF]">{stats.name}</span>
            </h1>
            <p className="text-[#8E8E93] text-[13px] mt-1">Твоя статистика и достижения</p>
        </div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-2 gap-3 mb-3">
            
            {/* 1. СТАТИСТИКА (Широкая) */}
            <StatsBlock stats={stats} />

            {/* 2. ДЕЙЛИ (Квадрат) */}
            <NavCard 
                title="Дейли Лидеры" 
                sub="Рейтинг дня"
                icon={FireIcon} 
                href="/leaderboard/daily"
                gradient="linear-gradient(135deg, #2C1810 0%, #1C1C1E 100%)"
            />

            {/* 3. ТУРНИРЫ (Квадрат) */}
            <NavCard 
                title="Топ Турниров" 
                sub="Общий рейтинг"
                icon={CupIcon} 
                href="/leaderboard/tournaments"
                gradient="linear-gradient(135deg, #2C2510 0%, #1C1C1E 100%)"
            />
            
            {/* 4. МОИ ТУРНИРЫ (ИСТОРИЯ) - Широкая плитка во всю ширину */}
            <BentoCard className="col-span-2 p-5 min-h-[300px] flex flex-col" gradient="linear-gradient(180deg, #1C1C1E 0%, #141414 100%)">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-[16px]">Мои турниры</h3>
                </div>

                {/* Фильтры */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide mb-2">
                    {['ВСЕ', 'ATP', 'WTA', 'ТБШ'].map(tag => (
                        <FilterPill key={tag} label={tag} isActive={historyTag === tag} onClick={() => setHistoryTag(tag)} />
                    ))}
                </div>

                {/* Список */}
                <div className="flex flex-col gap-2 mt-2">
                    {filteredHistory.length === 0 ? (
                        <div className="py-10 text-center text-[#5F6067] text-sm">История пуста</div>
                    ) : (
                        filteredHistory.map((row) => (
                            <Link href={`/tournament/${row.tournament_id}`} key={row.tournament_id} onClick={() => impact('light')}>
                                <div className="bg-[#2C2C2E]/50 rounded-[16px] p-3 border border-white/5 flex justify-between items-center active:scale-[0.99] transition-transform">
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
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </BentoCard>

            {/* 5. ПРАВИЛА (Широкая плитка внизу, или можно сделать маленькой, если решишь) */}
            <BentoCard 
                onClick={() => { impact('light'); router.push('/rules'); }}
                className="col-span-2 p-4 flex items-center justify-between"
                gradient="linear-gradient(90deg, #1C1C1E 0%, #232325 100%)"
            >
                <div className="flex flex-col">
                    <span className="text-[15px] font-bold text-white">Правила игры</span>
                    <span className="text-[11px] text-[#8E8E93]">Как считаются очки?</span>
                </div>
                <div className="text-white/40"><BookIcon /></div>
            </BentoCard>

        </div>
      </main>
    </div>
  );
}