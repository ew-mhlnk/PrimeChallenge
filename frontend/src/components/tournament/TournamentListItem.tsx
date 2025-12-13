'use client';

import { Tournament } from '@/types';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Хелпер для цветов покрытия
const getSurfaceColor = (surface?: string) => {
    const s = surface?.toLowerCase() || '';
    if (s.includes('clay') || s.includes('грунт')) return 'bg-[#E06528]'; // Оранжевый
    if (s.includes('grass') || s.includes('трава')) return 'bg-[#3E8E41]'; // Зеленый
    if (s.includes('hard') || s.includes('хард')) return 'bg-[#007AFF]'; // Синий
    return 'bg-[#8E8E93]'; // Серый дефолт
};

export const TournamentListItem = ({ tournament }: { tournament: Tournament }) => {
  const isCompleted = tournament.status === 'COMPLETED';
  
  // Определяем статус текстом
  let statusBadge = null;
  if (tournament.status === 'ACTIVE') {
      statusBadge = <span className="text-[#32D74B] text-[11px] font-bold uppercase">Live</span>;
  } else if (tournament.status === 'CLOSED') {
      statusBadge = <span className="text-[#FFD700] text-[11px] font-bold uppercase">Идет</span>;
  } else if (isCompleted) {
      statusBadge = <span className="text-[#8E8E93] text-[11px] font-medium">Завершен</span>;
  } else {
      // Это покрывает PLANNED и любые другие случаи
      statusBadge = <span className="text-[#8E8E93] text-[11px] font-medium">Скоро</span>;
  }

  return (
    <Link href={`/tournament/${tournament.id}`} className="block w-full mb-3">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="w-full bg-[#1C1C1E] rounded-[20px] border border-white/5 p-4 flex items-center justify-between shadow-sm relative overflow-hidden"
      >
        <div className="flex items-center gap-4 relative z-10">
            {/* Индикатор покрытия */}
            <div className={`w-1.5 h-10 rounded-full ${getSurfaceColor(tournament.surface)}`} />
            
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-white leading-tight">
                        {tournament.name}
                    </h3>
                    {tournament.tag && (
                       <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60 uppercase">
                         {tournament.tag}
                       </span>
                    )}
                </div>
                <span className="text-[12px] text-[#8E8E93] mt-0.5">
                    {tournament.dates}
                </span>
            </div>
        </div>

        <div className="text-right relative z-10">
            {statusBadge}
        </div>
      </motion.div>
    </Link>
  );
};