'use client';

import { motion } from 'framer-motion';
import { DailyMatch } from '@/types';
import styles from './Daily.module.css';

interface Props {
  match: DailyMatch;
  onPick: (id: string, w: 1 | 2) => void;
  disabled?: boolean;
}

const parseScores = (scoreStr?: string) => {
    if (!scoreStr) return { p1: [], p2: [] };
    // Чистим от лишних пробелов и разбиваем
    const sets = scoreStr.split(',').map(s => s.trim());
    const p1Scores: string[] = [];
    const p2Scores: string[] = [];

    sets.forEach(set => {
        // Разделитель может быть дефисом или длинным тире
        const parts = set.split('-');
        if (parts.length >= 2) {
            p1Scores.push(parts[0]);
            p2Scores.push(parts[parts.length - 1]);
        }
    });
    return { p1: p1Scores, p2: p2Scores };
};

const ScoreDigit = ({ value, colorClass }: { value: string, colorClass: string }) => {
    const match = value.match(/^(\d+)\s*\((.+)\)$/);
    if (match) {
      const isLong = match[2].length > 2;
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

  // Приводим к единому формату (на всякий случай)
  const safeStatus = status?.toUpperCase() || 'PLANNED';
  const myPickNum = Number(my_pick);
  const winnerNum = Number(winner);

  // --- ЛОГИКА СТАТУСОВ (1 в 1 как в Bracket) ---
  const getPlayerStatus = (playerNum: 1 | 2) => {
      // Я выбрал этого?
      const isSelected = myPickNum === playerNum;
      
      // Если матч завершен
      if (safeStatus === 'COMPLETED' && winnerNum) {
          // 1. Угадал (Зеленый)
          if (isSelected && winnerNum === playerNum) return 'correct';
          // 2. Ошибся (Красный)
          if (isSelected && winnerNum !== playerNum) return 'incorrect';
          // 3. Не выбирал, но это победитель (Показываем зеленым для наглядности? Или серым?)
          // По твоей просьбе "не участвовал - никакое" -> оставляем default
          // Но если хочешь видеть кто победил, можно раскомментировать:
          // if (!isSelected && winnerNum === playerNum) return 'correct'; 
          return 'default';
      }
      
      // Если матч идет или планируется
      if (isSelected) return 'selected';
      
      return 'default';
  };

  const p1Stat = getPlayerStatus(1);
  const p2Stat = getPlayerStatus(2);

  // Сборка классов CSS
  const getRowClass = (st: string) => {
      let cls = styles.playerRow;
      if (st === 'selected') cls += ` ${styles.selected}`;
      if (st === 'correct') cls += ` ${styles.correct}`;
      if (st === 'incorrect') cls += ` ${styles.incorrect}`;
      // Дизейбл визуальный только если мы не выбрали эту ячейку, а выбор уже сделан (или матч идет)
      if (disabled && st === 'default') cls += ` ${styles.disabled}`;
      return cls;
  };

  const getScoreColor = (st: string) => {
      if (st === 'correct') return styles.scoreCorrect;
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
          
          {safeStatus === 'LIVE' && (
              <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">
                  LIVE
              </span>
          )}
          {safeStatus === 'COMPLETED' && (
              <span className="text-[9px] text-[#5F6067] font-bold uppercase">Завершен</span>
          )}
      </div>

      {/* ИГРОК 1 */}
      <div 
        className={getRowClass(p1Stat)} 
        onClick={() => !disabled && onPick(id, 1)}
        style={{ textDecoration: 'none' }}
      >
          <div className={styles.playerName}>
              <span style={{ textDecoration: p1Stat === 'incorrect' ? 'line-through' : 'none' }}>
                  {player1}
              </span>
              {/* Подсказка: Если я выбрал П1, а выиграл П2 */}
              {p1Stat === 'incorrect' && winnerNum === 2 && (
                  <span className="text-[#8E8E93] text-[10px] ml-2 no-underline opacity-80">→ {player2}</span>
              )}
          </div>
          
          <div className="flex items-center gap-1">
              {p1Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p1Stat)} />)}
          </div>
      </div>

      {/* ИГРОК 2 */}
      <div 
        className={getRowClass(p2Stat)} 
        onClick={() => !disabled && onPick(id, 2)}
        style={{ textDecoration: 'none' }}
      >
          <div className={styles.playerName}>
              <span style={{ textDecoration: p2Stat === 'incorrect' ? 'line-through' : 'none' }}>
                  {player2}
              </span>
              {/* Подсказка: Если я выбрал П2, а выиграл П1 */}
              {p2Stat === 'incorrect' && winnerNum === 1 && (
                  <span className="text-[#8E8E93] text-[10px] ml-2 no-underline opacity-80">→ {player1}</span>
              )}
          </div>

          <div className="flex items-center gap-1">
              {p2Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p2Stat)} />)}
          </div>
      </div>

    </motion.div>
  );
};