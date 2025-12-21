'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import useTournaments from '../hooks/useTournaments';
import useAuth from '../hooks/useAuth';
import { Tournament } from '@/types';
// ИМПОРТ НОВОГО КОМПОНЕНТА
import { TournamentCard } from '@/components/tournament/TournamentCard';

// 1. Теги (Оставляем локально, так как используются только здесь)
interface FilterPillProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  colorClass: string;
}

const FilterPill = ({ label, isActive, onClick, colorClass }: FilterPillProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-5 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all duration-300
        ${isActive ? 'text-white shadow-lg scale-105' : 'text-[#8E8E93] bg-[#1C1C1E] border border-white/5'}
      `}
    >
      {isActive && (
        <motion.div
          layoutId="activeTagBg"
          className={`absolute inset-0 rounded-full -z-10 ${colorClass}`}
          initial={false}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
      <span className={`relative z-10 ${isActive && label === 'ТБШ' ? 'text-black/80' : ''}`}>
        {label}
      </span>
    </button>
  );
};

// 2. Loading Screen (Оставляем)
const LoadingScreen = () => (
  <div className="fixed inset-0 z-50 bg-[#141414] flex flex-col items-center justify-center">
    <div 
        className="absolute top-[-100px] left-[-100px] w-[453px] h-[453px] rounded-full pointer-events-none"
        style={{ background: '#0B80B3', filter: 'blur(90px)', opacity: 0.6, transform: 'rotate(-60deg)' }}
    />
    <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#00B2FF] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#00B2FF] font-bold text-sm tracking-widest uppercase animate-pulse">Загрузка...</p>
    </div>
  </div>
);

// --- MAIN PAGE ---

export default function Home() {
  const { tournaments, error, isLoading } = useTournaments();
  const { user } = useAuth();
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');

  const filters = [
    { label: 'ВСЕ', color: 'bg-[#007AFF]' },
    { label: 'ATP', color: 'bg-[#002BFF]' },
    { label: 'WTA', color: 'bg-[#7B00FF]' },
    { label: 'ТБШ', color: 'bg-gradient-to-r from-[#FDF765] to-[#DAB07F]' },
  ];

  if (isLoading) return <LoadingScreen />;
  if (error) return <p className="text-red-500 px-8 pt-20">Ошибка: {error}</p>;

  // На главной только ACTIVE и CLOSED
  const activeTournaments = tournaments ? tournaments.filter((tournament: Tournament) => {
    if (!['ACTIVE', 'CLOSED'].includes(tournament.status)) return false;
    
    if (selectedTag === 'ВСЕ') return true;
    return tournament.tag === selectedTag;
  }) : [];

  const userName = user?.firstName || 'Друг';

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col relative overflow-x-hidden pb-32">
      
      <div 
        className="fixed top-[-100px] left-[-100px] w-[453px] h-[453px] rounded-full pointer-events-none"
        style={{
          background: '#0B80B3',
          filter: 'blur(90px)',
          opacity: 0.6,
          transform: 'rotate(-60deg)',
          zIndex: 0
        }}
      />

      <main className="relative z-10 px-6 pt-12 flex flex-col gap-8">
        
        <header className="flex flex-col justify-center mt-2">
            <span className="text-[14px] text-[#8E8E93] font-medium uppercase tracking-wide mb-1">
              Prime Bracket
            </span>
            <h1 className="text-[32px] font-bold text-white leading-none tracking-tight">
              Привет, <span className="text-[#00B2FF]">{userName}</span>
            </h1>
        </header>

        <motion.div 
          whileTap={{ scale: 0.98 }}
          className="w-full h-[120px] bg-[#D9D9D9] rounded-[24px] relative overflow-hidden cursor-pointer shadow-lg"
        >
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                style={{ transform: 'skewX(-20deg) translateX(-150%)' }} />
           
           <div className="absolute bottom-3 left-4">
              <span className="text-black/60 text-[10px] font-bold uppercase tracking-widest bg-white/40 px-2 py-1 rounded backdrop-blur-md">
                Promo
              </span>
           </div>
        </motion.div>

        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-[20px] font-bold text-white tracking-tight">
              Турниры этой недели
            </h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
            {filters.map((f) => (
              <FilterPill 
                key={f.label} 
                label={f.label} 
                isActive={selectedTag === f.label}
                colorClass={f.color}
                onClick={() => setSelectedTag(f.label)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-1">
            {!tournaments ? (
               [1,2].map(i => (
                 <div key={i} className="h-[120px] w-full bg-[#1C1C1E] rounded-[24px] animate-pulse border border-white/5" />
               ))
            ) : activeTournaments.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-[#8E8E93] text-sm">Нет активных турниров</p>
                    <Link href="/archive" className="text-[#007AFF] text-sm mt-2 block">Посмотреть календарь</Link>
                </div>
            ) : (
                activeTournaments.map((tournament: Tournament) => (
                  // ИСПОЛЬЗУЕМ НОВЫЙ КОМПОНЕНТ
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}