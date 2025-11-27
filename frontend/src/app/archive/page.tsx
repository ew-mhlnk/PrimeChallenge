'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import useTournaments from '../../hooks/useTournaments';
import { Tournament } from '@/types';

// Карточка турнира
const ArchiveCard = ({ tournament }: { tournament: Tournament }) => {
  return (
    <Link href={`/tournament/${tournament.id}`} className="block w-full">
      <motion.div
        whileTap={{ scale: 0.96 }}
        className="w-full bg-[#1C1C1E] rounded-[28px] border border-white/5 p-5 shadow-lg group relative overflow-hidden"
      >
        <div className="flex items-start justify-between relative z-10">
             <h3 className="text-[18px] font-bold text-white leading-tight pr-2 opacity-80 group-hover:opacity-100 transition-opacity">
                {tournament.name}
             </h3>
             {tournament.tag && (
               <span className="text-[10px] font-bold px-2 py-1 rounded border border-white/10 text-[#8E8E93] uppercase">
                 {tournament.tag}
               </span>
             )}
        </div>
        <p className="text-[12px] text-[#5F6067] mt-1 relative z-10">
            {tournament.dates}
        </p>
        
        {/* Индикатор завершенности */}
        <div className="mt-4 flex items-center gap-2 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5F6067]" />
            <span className="text-[11px] font-medium text-[#5F6067]">Завершен</span>
        </div>
      </motion.div>
    </Link>
  );
};

// --- ИСПРАВЛЕНИЕ: Добавлен интерфейс для пропсов ---
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const FilterButton = ({ label, isActive, onClick }: FilterButtonProps) => (
    <button
      onClick={onClick}
      className={`
        px-5 py-2.5 rounded-full text-[13px] font-bold transition-all
        ${isActive ? 'bg-white text-black' : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/5'}
      `}
    >
      {label}
    </button>
);

export default function Archive() {
  const { tournaments, error } = useTournaments();
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');

  if (error) return <p className="text-red-500 px-8 pt-20">Ошибка: {error}</p>;

  // Фильтрация: только COMPLETED
  const completedTournaments = tournaments ? tournaments.filter((t: Tournament) => {
    if (t.status !== 'COMPLETED') return false;
    if (selectedTag === 'ВСЕ') return true;
    return t.tag === selectedTag;
  }) : [];

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32">
      
      {/* Header */}
      <header className="px-6 pt-10 pb-6">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Архив</h1>
            <Link href="/">
                <div className="w-10 h-10 rounded-full bg-[#1C1C1E] flex items-center justify-center border border-white/5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2">
                        <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            </Link>
        </div>

        {/* Фильтры */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {['ВСЕ', 'ATP', 'WTA', 'ТБШ'].map(tag => (
                <FilterButton key={tag} label={tag} isActive={selectedTag === tag} onClick={() => setSelectedTag(tag)} />
            ))}
        </div>
      </header>

      <main className="px-6 flex flex-col gap-4">
        {!tournaments ? (
            <p className="text-[#5F6067] text-center mt-10">Загрузка...</p>
        ) : completedTournaments.length === 0 ? (
            <div className="text-center py-20 opacity-50">
                <p>Нет завершенных турниров</p>
            </div>
        ) : (
            completedTournaments.map((t: Tournament) => (
              <ArchiveCard key={t.id} tournament={t} />
            ))
        )}
      </main>
    </div>
  );
}