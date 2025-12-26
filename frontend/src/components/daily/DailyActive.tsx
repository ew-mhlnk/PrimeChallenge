'use client';
import { DailyMatchCard } from './DailyMatchCard';
import { DailyMatch } from '@/types';

interface Props {
    matches: DailyMatch[];
    status: 'ACTIVE' | 'COMPLETED';
}

export default function DailyActive({ matches, status }: Props) {
  const isCompleted = status === 'COMPLETED';
  
  // Считаем очки
  const correctPicks = matches.filter(m => m.my_pick && m.my_pick === m.winner).length;
  const totalFinished = matches.filter(m => m.status === 'COMPLETED').length;

  return (
    <div className="pb-32 px-4 animate-fade-in">
       {/* Шапка */}
       <div className="mb-6 pt-2">
           <div className="flex items-center justify-between mb-2">
               <h2 className="text-[24px] font-bold text-white tracking-tight">
                   {isCompleted ? 'Итоги дня' : 'Матчи идут 🔥'}
               </h2>
               {!isCompleted && (
                   <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-1 rounded-md shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse">
                       LIVE
                   </span>
               )}
           </div>
           
           {/* Статистика для юзера */}
           <div className="bg-[#1C1C1E] rounded-xl p-3 border border-white/5 flex justify-between items-center">
               <span className="text-[#8E8E93] text-sm font-medium">Твой результат:</span>
               <div className="flex items-baseline gap-1">
                   <span className="text-[#32D74B] text-xl font-bold">{correctPicks}</span>
                   <span className="text-[#5F6067] text-xs">/ {matches.length}</span>
               </div>
           </div>
       </div>
       
       <div className="flex flex-col gap-3">
        {matches.map((match) => (
            // disabled=true, так как менять выбор уже нельзя
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