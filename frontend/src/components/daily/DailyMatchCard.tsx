'use client';

import { motion } from 'framer-motion';
import { DailyMatch } from '@/types';

interface Props {
  match: DailyMatch;
  onPick: (id: string, w: 1 | 2) => void;
  disabled?: boolean;
}

export const DailyMatchCard = ({ match, onPick, disabled }: Props) => {
  const { id, player1, player2, start_time, tournament, status, my_pick, winner, score } = match;

  // Функция для стилизации кнопок
  const getBtnStyle = (playerNum: 1 | 2) => {
    const isSelected = my_pick === playerNum;
    const isWinner = winner === playerNum;

    // Базовые стили: шрифт, скругление, отступы
    let cls = "relative flex-1 py-3 px-3 rounded-[16px] text-[13px] font-bold transition-all border overflow-hidden ";

    // 1. Если матч ЗАВЕРШЕН (Показываем результат)
    if (status === 'COMPLETED' && winner) {
        if (isSelected && isWinner) return cls + "bg-[#32D74B]/20 border-[#32D74B] text-[#32D74B] shadow-[0_0_10px_rgba(50,215,75,0.2)]"; // Победа (Зеленый)
        if (isSelected && !isWinner) return cls + "bg-[#FF453A]/20 border-[#FF453A] text-[#FF453A] line-through decoration-2 opacity-80"; // Проигрыш (Красный)
        if (!isSelected && isWinner) return cls + "bg-white/10 border-white/20 text-white/60"; // Победитель (не мой выбор)
        return cls + "bg-[#1C1C1E] border-transparent text-white/20 opacity-40"; // Проигравший (не мой выбор)
    }

    // 2. Если ВЫБРАН (Подсветка синим)
    if (isSelected) return cls + "bg-[#007AFF] border-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)] scale-[1.02]";
    
    // 3. Если ЗАБЛОКИРОВАН (Live или просто disabled)
    if (disabled) return cls + "bg-[#1C1C1E] border-white/5 text-white/30 cursor-not-allowed";
    
    // 4. Обычное состояние (Можно кликать)
    return cls + "bg-[#1C1C1E] border-white/10 text-white hover:bg-[#2C2C2E] active:scale-95 hover:border-white/20";
  };

  return (
    <motion.div 
        layout
        className="bg-[#121212] rounded-[24px] p-4 border border-white/10 w-full shadow-sm"
    >
      {/* --- ШАПКА КАРТОЧКИ --- */}
      <div className="flex justify-between items-center mb-3.5 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-nowrap max-w-[120px] truncate">
                {tournament}
            </span>
            <span className="text-[11px] font-medium text-[#5F6067] whitespace-nowrap">{start_time}</span>
          </div>
          
          {/* Индикаторы статуса */}
          {status === 'LIVE' && (
              <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                  <div className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                  </div>
                  <span className="text-[9px] text-red-500 font-bold tracking-wide">LIVE</span>
              </div>
          )}
          {status === 'COMPLETED' && <span className="text-[10px] text-[#5F6067] font-bold uppercase tracking-wide">Завершен</span>}
      </div>

      {/* --- ИГРОКИ И СЧЕТ --- */}
      <div className="flex items-stretch gap-2.5">
          {/* Игрок 1 */}
          <button onClick={() => !disabled && onPick(id, 1)} className={getBtnStyle(1)} disabled={disabled}>
             <span className="truncate w-full block text-center leading-tight">{player1}</span>
          </button>

          {/* Центр: VS или Счет */}
          <div className="flex flex-col items-center justify-center min-w-[50px] shrink-0">
              {status === 'PLANNED' ? (
                  <span className="text-[12px] text-[#5F6067] font-bold italic opacity-50">VS</span>
              ) : (
                  <div className="flex flex-col items-center gap-0.5">
                     <span className="text-[13px] text-white font-mono font-bold tracking-widest leading-none">
                        {score ? score.split(' ').slice(0, 2).join(' ') : "0-0"}
                     </span>
                     {/* Если есть доп. инфо в скобках (15-40), показываем мелко */}
                     {score && score.includes('(') && (
                         <span className="text-[10px] text-[#00B2FF] font-mono font-medium">
                            {score.match(/\((.*?)\)/)?.[0]}
                         </span>
                     )}
                  </div>
              )}
          </div>

          {/* Игрок 2 */}
          <button onClick={() => !disabled && onPick(id, 2)} className={getBtnStyle(2)} disabled={disabled}>
             <span className="truncate w-full block text-center leading-tight">{player2}</span>
          </button>
      </div>
    </motion.div>
  );
};