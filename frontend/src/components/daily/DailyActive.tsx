'use client';
import { DailyMatchCard } from './DailyMatchCard';
import { DailyMatch } from '@/types';

interface Props {
    matches: DailyMatch[];
    status: 'ACTIVE' | 'COMPLETED';
}

export default function DailyActive({ matches, status }: Props) {
  // Считаем личный результат
  const correctPicks = matches.filter(m => m.my_pick && m.my_pick === m.winner).length;
  // Считаем сколько матчей вообще завершилось (чтобы показывать N/10)
  const finishedCount = matches.filter(m => m.status === 'COMPLETED').length;

  return (
    <div className="pb-32 px-4 animate-fade-in">
       
       {/* Блок результата (оставляем, он полезный) */}
       <div className="mb-5 pt-2">
           <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5 flex justify-between items-center shadow-md">
               <div className="flex flex-col">
                   <span className="text-[#8E8E93] text-xs font-medium uppercase tracking-wide">Твой результат</span>
                   <span className="text-[10px] text-[#5F6067]">за сегодня</span>
               </div>
               <div className="flex items-baseline gap-1.5">
                   <span className="text-[#32D74B] text-2xl font-bold">{correctPicks}</span>
                   <span className="text-[#5F6067] text-sm font-medium">/ {finishedCount}</span>
               </div>
           </div>
       </div>
       
       {/* Список карточек */}
       <div className="flex flex-col gap-3">
        {matches.map((match) => (
            <DailyMatchCard 
                key={match.id} 
                match={match} 
                onPick={() => {}} 
                disabled={true} 
            />
        ))}
      </div>
    </div>
  );
}