'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
        className="w-full bg-[#1C1C1E] rounded-[24px] border border-white/5 p-5 shadow-lg group relative overflow-hidden"
      >
        <div className="flex items-start justify-between relative z-10">
             <h3 className="text-[18px] font-bold text-white leading-tight pr-2 opacity-90">
                {tournament.name}
             </h3>
             {tournament.tag && (
               <span className={`
                 text-[10px] font-black px-2 py-0.5 rounded-md border border-white/10 uppercase
                 ${tournament.tag === 'ATP' ? 'bg-[#002BFF]/20 text-[#5E83FF]' : ''}
                 ${tournament.tag === 'WTA' ? 'bg-[#7B00FF]/20 text-[#C685FF]' : ''}
                 ${tournament.tag === 'ТБШ' ? 'bg-yellow-500/20 text-yellow-300' : ''}
               `}>
                 {tournament.tag}
               </span>
             )}
        </div>
        <p className="text-[12px] text-[#5F6067] mt-1 relative z-10">
            {tournament.dates}
        </p>
        
        <div className="mt-4 flex items-center gap-2 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-[#5F6067]" />
            <span className="text-[11px] font-medium text-[#5F6067]">Завершен</span>
        </div>
      </motion.div>
    </Link>
  );
};

// --- ИСПРАВЛЕНИЕ: Добавлен интерфейс ---
interface FilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

// Цветной фильтр
const FilterButton = ({ label, isActive, onClick }: FilterButtonProps) => {
  let colorClass = 'bg-[#007AFF]';
  if (label === 'ATP') colorClass = 'bg-[#002BFF]';
  if (label === 'WTA') colorClass = 'bg-[#7B00FF]';
  if (label === 'ТБШ') colorClass = 'bg-gradient-to-r from-[#FDF765] to-[#DAB07F] text-black/80';

  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-2 rounded-full text-[12px] font-bold tracking-wide transition-all duration-300
        ${isActive ? `${colorClass} text-white shadow-lg scale-105` : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/5'}
      `}
    >
      {label}
    </button>
  );
};

export default function Archive() {
  const router = useRouter();
  const { tournaments, error } = useTournaments();
  const [selectedTag, setSelectedTag] = useState<string>('ВСЕ');

  if (error) return <p className="text-red-500 px-8 pt-20">Ошибка: {error}</p>;

  const completedTournaments = tournaments ? tournaments.filter((t: Tournament) => {
    if (t.status !== 'COMPLETED') return false;
    if (selectedTag === 'ВСЕ') return true;
    return t.tag === selectedTag;
  }) : [];

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col pb-32">
      
      {/* Header */}
      <header className="px-6 pt-8 pb-6 flex flex-col gap-4">
        {/* Кнопка Назад */}
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1C1C1E] border border-white/10 active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 19L8 12L15 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <h1 className="text-3xl font-bold text-white">Архив</h1>

        {/* Фильтры */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
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