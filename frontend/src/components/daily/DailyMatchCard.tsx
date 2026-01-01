'use client';

import { motion } from 'framer-motion';
import { DailyMatch } from '@/types';
import styles from './Daily.module.css';

interface Props {
  match: DailyMatch;
  onPick: (id: string, w: 1 | 2) => void;
  disabled?: boolean;
}

// Хелпер парсинга счета
const parseScores = (scoreStr?: string) => {
    if (!scoreStr) return { p1: [], p2: [] };
    const sets = scoreStr.split(',').map(s => s.trim());
    const p1Scores: string[] = [];
    const p2Scores: string[] = [];

    sets.forEach(set => {
        const parts = set.split('-');
        if (parts.length >= 2) {
            p1Scores.push(parts[0]);
            p2Scores.push(parts[parts.length - 1]);
        }
    });
    return { p1: p1Scores, p2: p2Scores };
};

// Хелпер отображения цифры (с тай-брейком)
const ScoreDigit = ({ value, colorClass }: { value: string, colorClass: string }) => {
    const match = value.match(/^(\d+)\s*\((.+)\)$/);
    if (match) {
      const isLong = match[2].length > 2; // Если там текст типа "Ret."
      return (
        <span className={`${styles.scoreDigit} ${colorClass} flex justify-center items-start leading-none !w-6`}>
          {match[1]}
          <span className={`
            ml-[1px] opacity-80 whitespace-nowrap
            ${isLong ? 'text-[7px] -mt-0.5 tracking-tighter' : 'text-[8px] -mt-0.5'}
          `}>
            {match[2]}
          </span>
        </span>
      );
    }
    return <span className={`${styles.scoreDigit} ${colorClass}`}>{value}</span>;
};

export const DailyMatchCard = ({ match, onPick, disabled }: Props) => {
  const { id, player1, player2, start_time, tournament, status, my_pick, winner, score } = match;
  const { p1: p1Scores, p2: p2Scores } = parseScores(score);

  // --- ЛОГИКА ОПРЕДЕЛЕНИЯ СТАТУСА (Как в Bracket) ---
  
  // Функция получения статуса для конкретного игрока (1 или 2)
  const getPlayerStatus = (playerNum: 1 | 2) => {
      // 1. Если я выбрал этого игрока
      const isSelected = my_pick === playerNum;
      
      if (status === 'COMPLETED' && winner) {
          // Если я выбрал его и он победил -> CORRECT (Зеленый)
          if (isSelected && winner === playerNum) return 'correct';
          // Если я выбрал его, но он проиграл -> INCORRECT (Красный)
          if (isSelected && winner !== playerNum) return 'incorrect';
          // Если я НЕ выбирал его, но он победил -> Просто показываем (можно добавить стиль winner, но пока default)
          if (!isSelected && winner === playerNum) return 'default';
      }
      
      // Если матч не закончен, но я выбрал -> SELECTED (Синий)
      if (isSelected) return 'selected';
      
      return 'default';
  };

  const p1Status = getPlayerStatus(1);
  const p2Status = getPlayerStatus(2);

  // Определение классов CSS на основе статуса
  const getRowClass = (st: string) => {
      let cls = styles.playerRow;
      if (st === 'selected') cls += ` ${styles.selected}`;
      if (st === 'correct') cls += ` ${styles.correct}`;
      if (st === 'incorrect') cls += ` ${styles.incorrect}`;
      if (disabled && st === 'default') cls += ` ${styles.disabled}`; // Дизейбл только для невыбранных
      return cls;
  };

  const getScoreColor = (st: string) => {
      if (st === 'correct') return styles.scoreCorrect; // Зеленый текст (или белый на зеленом фоне)
      if (st === 'incorrect') return styles.scoreIncorrect;
      if (st === 'selected') return styles.scoreSelected;
      return styles.scoreDefault;
  };

  return (
    <motion.div layout className={styles.cardContainer}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-nowrap truncate max-w-[200px]">
                {tournament}
            </span>
            <span className="text-[11px] font-medium text-[#5F6067] whitespace-nowrap">
                {start_time}
            </span>
          </div>
          
          {status === 'LIVE' && (
              <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">
                  LIVE
              </span>
          )}
          {status === 'COMPLETED' && (
              <span className="text-[9px] text-[#5F6067] font-bold uppercase">Завершен</span>
          )}
      </div>

      {/* ИГРОК 1 */}
      <div 
        className={getRowClass(p1Status)} 
        onClick={() => !disabled && onPick(id, 1)}
        // Убираем зачеркивание с контейнера
        style={{ textDecoration: 'none' }}
      >
          <div className={styles.playerName}>
              {/* Зачеркиваем только имя */}
              <span style={{ textDecoration: p1Status === 'incorrect' ? 'line-through' : 'none' }}>
                  {player1}
              </span>
              {/* Подсказка если ошибся */}
              {p1Status === 'incorrect' && (
                  <span className="text-[#8E8E93] text-[10px] ml-2 no-underline opacity-80">→ {player2}</span>
              )}
          </div>
          
          <div className="flex items-center gap-1">
              {p1Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p1Status)} />)}
          </div>
      </div>

      {/* ИГРОК 2 */}
      <div 
        className={getRowClass(p2Status)} 
        onClick={() => !disabled && onPick(id, 2)}
        style={{ textDecoration: 'none' }}
      >
          <div className={styles.playerName}>
              <span style={{ textDecoration: p2Status === 'incorrect' ? 'line-through' : 'none' }}>
                  {player2}
              </span>
              {/* Подсказка */}
              {p2Status === 'incorrect' && (
                  <span className="text-[#8E8E93] text-[10px] ml-2 no-underline opacity-80">→ {player1}</span>
              )}
          </div>

          <div className="flex items-center gap-1">
              {p2Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p2Status)} />)}
          </div>
      </div>

    </motion.div>
  );
};