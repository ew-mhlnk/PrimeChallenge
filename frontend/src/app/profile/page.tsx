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
const CupIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>);
const FireIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c0 0-3 3.5-3 6 0 1.5 1 3 1 3s-3-1-3-4c0 0-3 2-3 6 0 4.418 3.582 8 8 8s8-3.582 8-8c0-4-3-6-3-6s0 3 0 4c0 0 1-1.5 1-3 0-2.5-3-6-3-6z"/></svg>);
const BookIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>);
const SparkleIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/><path d="M19 3l.75 2.75L22 6.5l-2.25.75L19 10l-.75-2.75L16 6.5l2.25-.75L19 3z"/></svg>);

// --- КОМПОНЕНТЫ ---

// Floating particles animation
const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                initial={{ 
                    x: Math.random() * 100 + '%', 
                    y: Math.random() * 100 + '%',
                    scale: 0 
                }}
                animate={{
                    y: [null, Math.random() * -100 - 20],
                    scale: [0, 1, 0],
                    opacity: [0, 0.6, 0]
                }}
                transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeOut"
                }}
            />
        ))}
    </div>
);

// 1. Карточка БЕНТО (Обертка) - Glassmorphism Premium
const BentoCard = ({ children, className, onClick, gradient, withParticles = false }: { children: React.ReactNode, className?: string, onClick?: () => void, gradient?: string, withParticles?: boolean }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={onClick ? { scale: 1.02, transition: { duration: 0.2 } } : {}}
            whileTap={onClick ? { scale: 0.98 } : {}}
            onClick={onClick}
            className={`
                relative overflow-hidden rounded-[28px] 
                bg-gradient-to-br from-white/[0.08] to-white/[0.02]
                backdrop-blur-xl
                border border-white/10
                shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {/* Animated gradient overlay */}
            <motion.div 
                className="absolute inset-0 z-0 opacity-40" 
                style={{ 
                    background: gradient || 'linear-gradient(135deg, rgba(44,44,46,0.8) 0%, rgba(28,28,30,0.9) 100%)',
                    mixBlendMode: 'overlay'
                }}
                animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    ease: 'linear'
                }}
            />
            
            {/* Shimmer effect */}
            <motion.div
                className="absolute inset-0 z-[1]"
                style={{
                    background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
                    backgroundSize: '200% 100%',
                }}
                animate={{
                    backgroundPosition: ['200% 0', '-200% 0'],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'linear',
                    repeatDelay: 2
                }}
            />

            {/* Floating particles */}
            {withParticles && <FloatingParticles />}
            
            {/* Inner glow */}
            <div className="absolute inset-[1px] rounded-[27px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-[2]" />
            
            {/* Контент */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </motion.div>
    );
};

// 2. Статистика (Главный блок) - Enhanced
const StatsBlock = ({ stats }: { stats: any }) => {
    const overall = stats.cumulative.find((s: any) => s.category === 'Overall') || {};
    
    return (
        <BentoCard 
            className="col-span-2 p-6 flex flex-col justify-between min-h-[160px]" 
            gradient="linear-gradient(135deg, #006ba8 0%, #003d5c 50%, #001a2e 100%)"
            withParticles={true}
        >
            <div className="flex justify-between items-start">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 mb-2"
                    >
                        <SparkleIcon />
                        <h3 className="text-[#A0D9FF] text-xs font-bold uppercase tracking-widest">Моя статистика</h3>
                    </motion.div>
                    <motion.h2 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-white text-3xl font-black leading-none tracking-tight"
                    >
                        Overall
                    </motion.h2>
                </div>
                <motion.div 
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="p-2.5 bg-white/15 backdrop-blur-sm rounded-2xl text-white/90 shadow-lg"
                >
                    <StatsIcon />
                </motion.div>
            </div>

            <div className="flex items-end gap-8 mt-5">
                {[
                    { label: 'Ранг', value: `#${overall.rank || '-'}`, color: 'text-white', delay: 0.4 },
                    { label: 'Очки', value: overall.points || 0, color: 'text-[#00D9FF]', delay: 0.5 },
                    { label: 'Точность', value: overall.percent_correct || '0%', color: 'text-[#30E566]', delay: 0.6 }
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: stat.delay }}
                    >
                        <span className="text-[10px] text-[#A0D9FF]/70 block uppercase mb-1 tracking-wider font-semibold">
                            {stat.label}
                        </span>
                        <span className={`text-[22px] font-black ${stat.color} tracking-tight`}>
                            {stat.value}
                        </span>
                    </motion.div>
                ))}
            </div>
        </BentoCard>
    );
};

// 3. Маленькая навигационная карточка - Enhanced
const NavCard = ({ title, sub, icon: Icon, href, gradient }: { title: string, sub: string, icon: any, href: string, gradient: string }) => {
    const { impact } = useHapticFeedback();
    const router = useRouter();

    return (
        <BentoCard 
            onClick={() => { impact('light'); router.push(href); }}
            className="col-span-1 p-5 flex flex-col justify-between aspect-square group"
            gradient={gradient}
        >
            <motion.div 
                className="flex justify-end text-white/40 group-hover:text-white/70"
                whileHover={{ scale: 1.2, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                <Icon />
            </motion.div>
            <div>
                <motion.span 
                    className="text-[10px] text-white/40 font-semibold block leading-tight mb-1.5 uppercase tracking-wider"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {sub}
                </motion.span>
                <motion.span 
                    className="text-[15px] font-black text-white leading-tight block tracking-tight"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {title}
                </motion.span>
            </div>
        </BentoCard>
    );
};

// 4. Фильтр (Pills) - Enhanced
const FilterPill = ({ label, isActive, onClick }: { label: string, isActive: boolean, onClick: () => void }) => {
    const { impact } = useHapticFeedback();
    return (
        <motion.button 
            onClick={() => { impact('light'); onClick(); }} 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
                relative px-5 py-2 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300
                ${isActive 
                    ? 'bg-gradient-to-r from-[#007AFF] to-[#0051D5] text-white shadow-[0_4px_16px_rgba(0,122,255,0.4)]' 
                    : 'bg-white/5 text-[#8E8E93] backdrop-blur-sm border border-white/10'
                }
            `}
        >
            {isActive && (
                <motion.div
                    layoutId="activeFilter"
                    className="absolute inset-0 bg-gradient-to-r from-[#007AFF] to-[#0051D5] rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
            <span className="relative z-10">{label}</span>
        </motion.button>
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#007AFF]/30 border-t-[#007AFF] rounded-full"
        />
      </div>
    );
  }
  
  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-red-500 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          Ошибка: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a] text-white pb-32 relative overflow-hidden">
      
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#007AFF]/10 rounded-full blur-[120px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#30E566]/10 rounded-full blur-[100px]"
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-2xl pt-6 pb-4 px-6 border-b border-white/10">
        <div className="relative flex items-center justify-center min-h-[40px]">
            <motion.button 
                onClick={() => { impact('light'); router.back(); }} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute left-0 w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-lg transition-all"
            >
                <BackIcon />
            </motion.button>
            <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[22px] font-black text-white tracking-tight leading-none"
            >
                Профиль
            </motion.h1>
        </div>
      </header>

      <main className="px-4 mt-8 relative z-10">
        
        {/* ПРИВЕТСТВИЕ */}
        <motion.div 
            className="mb-8 px-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
        >
            <h1 className="text-[32px] font-black text-white leading-tight tracking-tight">
                Привет,{' '}
                <motion.span 
                    className="bg-gradient-to-r from-[#00D9FF] to-[#007AFF] bg-clip-text text-transparent"
                    animate={{ 
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                    style={{ backgroundSize: '200% 200%' }}
                >
                    {stats.name}
                </motion.span>
            </h1>
            <motion.p 
                className="text-[#8E8E93] text-[14px] mt-2 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                Твоя статистика и достижения
            </motion.p>
        </motion.div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-2 gap-4 mb-4">
            
            {/* 1. СТАТИСТИКА (Широкая) */}
            <StatsBlock stats={stats} />

            {/* 2. ДЕЙЛИ (Квадрат) */}
            <NavCard 
                title="Дейли Лидеры" 
                sub="Рейтинг дня"
                icon={FireIcon} 
                href="/leaderboard/daily"
                gradient="linear-gradient(135deg, #FF6B35 0%, #CC3A00 50%, #991F00 100%)"
            />

            {/* 3. ТУРНИРЫ (Квадрат) */}
            <NavCard 
                title="Топ Турниров" 
                sub="Общий рейтинг"
                icon={CupIcon} 
                href="/leaderboard/tournaments"
                gradient="linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)"
            />
            
            {/* 4. МОИ ТУРНИРЫ (ИСТОРИЯ) */}
            <BentoCard 
                className="col-span-2 p-6 min-h-[340px] flex flex-col" 
                gradient="linear-gradient(180deg, rgba(28,28,30,0.9) 0%, rgba(20,20,20,0.95) 100%)"
            >
                <div className="flex justify-between items-center mb-5">
                    <motion.h3 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-white font-black text-[18px] tracking-tight"
                    >
                        Мои турниры
                    </motion.h3>
                </div>

                {/* Фильтры */}
                <motion.div 
                    className="flex gap-2 overflow-x-auto pb-3 -mx-2 px-2 scrollbar-hide mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    {['ВСЕ', 'ATP', 'WTA', 'ТБШ'].map(tag => (
                        <FilterPill key={tag} label={tag} isActive={historyTag === tag} onClick={() => setHistoryTag(tag)} />
                    ))}
                </motion.div>

                {/* Список */}
                <div className="flex flex-col gap-3 mt-2 overflow-y-auto max-h-[280px] pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <AnimatePresence mode="popLayout">
                        {filteredHistory.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-16 text-center text-[#5F6067] text-sm font-medium"
                            >
                                История пуста
                            </motion.div>
                        ) : (
                            filteredHistory.map((row, idx) => (
                                <motion.div
                                    key={row.tournament_id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <Link href={`/tournament/${row.tournament_id}`} onClick={() => impact('light')}>
                                        <motion.div 
                                            whileHover={{ scale: 1.02, x: 4 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="bg-gradient-to-r from-white/[0.06] to-white/[0.02] backdrop-blur-sm rounded-[20px] p-4 border border-white/10 flex justify-between items-center shadow-lg transition-all group"
                                        >
                                            <div className="flex flex-col">
                                                <h4 className="font-bold text-[15px] text-white leading-tight mb-1.5 group-hover:text-[#00D9FF] transition-colors">
                                                    {row.name}
                                                </h4>
                                                <div className="flex gap-2.5 text-[11px] text-[#8E8E93] font-medium">
                                                    <span className="text-[#00D9FF] font-bold">#{row.rank}</span>
                                                    <span>•</span>
                                                    <span>{row.points} pts</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <motion.span 
                                                    className="block text-[15px] font-black text-[#30E566]"
                                                    whileHover={{ scale: 1.1 }}
                                                >
                                                    {row.percent_correct}
                                                </motion.span>
                                            </div>
                                        </motion.div>
                                    </Link>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </BentoCard>

            {/* 5. ПРАВИЛА */}
            <BentoCard 
                onClick={() => { impact('light'); router.push('/rules'); }}
                className="col-span-2 p-5 flex items-center justify-between group"
                gradient="linear-gradient(90deg, rgba(40,40,42,0.9) 0%, rgba(35,35,37,0.9) 100%)"
            >
                <div className="flex flex-col">
                    <motion.span 
                        className="text-[16px] font-bold text-white mb-1 group-hover:text-[#00D9FF] transition-colors"
                        whileHover={{ x: 4 }}
                    >
                        Правила игры
                    </motion.span>
                    <span className="text-[12px] text-[#8E8E93] font-medium">Как считаются очки?</span>
                </div>
                <motion.div 
                    className="text-white/30 group-hover:text-white/60 transition-colors"
                    whileHover={{ rotate: 15, scale: 1.1 }}
                >
                    <BookIcon />
                </motion.div>
            </BentoCard>

        </div>
      </main>
    </div>
  );
}