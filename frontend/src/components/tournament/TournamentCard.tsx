'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Tournament } from '@/types';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

// Хелпер для цветов покрытия
const getSurfaceColor = (surface?: string) => {
    const s = surface?.toLowerCase() || '';
    if (s.includes('clay') || s.includes('грунт')) return 'bg-[#E06528]'; // Оранжевый
    if (s.includes('grass') || s.includes('трава')) return 'bg-[#3E8E41]'; // Зеленый
    if (s.includes('hard') || s.includes('хард')) return 'bg-[#007AFF]'; // Синий
    return 'bg-[#8E8E93]'; // Серый
};

// Хелпер для названия покрытия (сокращенно)
const getSurfaceName = (surface?: string) => {
    const s = surface?.toLowerCase() || '';
    if (s.includes('clay') || s.includes('грунт')) return 'Clay';
    if (s.includes('grass') || s.includes('трава')) return 'Grass';
    if (s.includes('hard') || s.includes('хард')) return 'Hard';
    return surface || 'Court';
};

export const TournamentCard = ({ tournament }: { tournament: Tournament }) => {
  const { impact } = useHapticFeedback();

  // Логика статусов
  const isActive = tournament.status === 'ACTIVE';
  const isClosed = tournament.status === 'CLOSED';
  const isCompleted = tournament.status === 'COMPLETED';
  const isPlanned = tournament.status === 'PLANNED';

  let statusBadge = null;

  if (isActive) {
      statusBadge = (
        <div className="flex items-center gap-1.5 bg-[#32D74B]/10 px-2 py-1 rounded-md border border-[#32D74B]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#32D74B] animate-pulse" />
            <span className="text-[#32D74B] text-[10px] font-bold uppercase tracking-wide">Live</span>
        </div>
      );
  } else if (isClosed) {
      statusBadge = (
        <div className="flex items-center gap-1.5 bg-[#FFD700]/10 px-2 py-1 rounded-md border border-[#FFD700]/20">
            <span className="text-[#FFD700] text-[10px] font-bold uppercase tracking-wide">Идет</span>
        </div>
      );
  } else if (isCompleted) {
      statusBadge = <span className="text-[#8E8E93] text-[11px] font-medium">Завершен</span>;
  } else if (isPlanned) {
      statusBadge = <span className="text-[#0A84FF] text-[11px] font-medium">Скоро</span>;
  }

  return (
    <Link href={`/tournament/${tournament.id}`} onClick={() => impact('light')} className="block w-full mb-3">
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="
            relative w-full bg-[#1C1C1E] rounded-[24px] p-4 
            border border-white/5 shadow-sm overflow-hidden
            flex items-center justify-between
        "
      >
        {/* Левая часть: Инфо */}
        <div className="flex items-center gap-4 relative z-10">
            
            {/* Индикатор покрытия (Вертикальная полоска + Иконка) */}
            <div className="flex flex-col items-center gap-1">
                <div className={`w-1 h-8 rounded-full ${getSurfaceColor(tournament.surface)}`} />
                <span className="text-[9px] text-[#5F6067] font-bold uppercase hidden sm:block">
                    {getSurfaceName(tournament.surface).slice(0,1)}
                </span>
            </div>
            
            <div className="flex flex-col gap-1">
                {/* Название + Тег */}
                <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-white leading-tight">
                        {tournament.name}
                    </h3>
                    {tournament.tag && (
                       <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] bg-white/10 text-white/70 uppercase tracking-wider border border-white/5">
                         {tournament.tag}
                       </span>
                    )}
                </div>

                {/* Даты и Детали */}
                <div className="flex items-center gap-2 text-[12px] text-[#8E8E93]">
                    <span>{tournament.dates || 'Даты уточняются'}</span>
                    {tournament.surface && (
                        <>
                            <span className="w-0.5 h-0.5 rounded-full bg-[#5F6067]" />
                            <span>{getSurfaceName(tournament.surface)}</span>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* Правая часть: Статус */}
        <div className="text-right relative z-10 pl-2">
            {statusBadge}
        </div>

        {/* Декоративный градиент при наведении (опционально для десктопа) */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </motion.div>
    </Link>
  );
};