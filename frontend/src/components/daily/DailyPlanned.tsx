'use client';

import { DailyMatchCard } from './DailyMatchCard';
import { motion } from 'framer-motion';
import { DailyMatch } from '@/types';

interface Props {
    matches: DailyMatch[];
    onPick: (id: string, w: 1 | 2) => void;
}

export default function DailyPlanned({ matches, onPick }: Props) {
  // Считаем прогресс
  const pickedCount = matches.filter(m => m.my_pick).length;
  const total = matches.length;
  const progress = total > 0 ? (pickedCount / total) * 100 : 0;

  return (
    <div className="pb-32 px-4 animate-fade-in">
      <div className="mb-8 text-center pt-2">
        <h2 className="text-[28px] font-bold text-white mb-1 tracking-tight">Дейли Челлендж</h2>
        <p className="text-[#8E8E93] text-[15px]">Сделай прогнозы до начала матчей</p>
        
        {/* Прогресс бар */}
        <div className="mt-5 relative h-2 bg-[#1C1C1E] rounded-full w-3/4 mx-auto overflow-hidden">
            <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#007AFF] to-[#00B2FF]"
            />
        </div>
        <p className="text-[11px] text-[#00B2FF] mt-2 font-bold uppercase tracking-wide">
            Выбрано {pickedCount} из {total}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {matches.map((match) => (
            <motion.div key={match.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <DailyMatchCard match={match} onPick={onPick} disabled={false} />
            </motion.div>
        ))}
      </div>
    </div>
  );
}