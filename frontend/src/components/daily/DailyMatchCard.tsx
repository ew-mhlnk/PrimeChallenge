'use client';

import { motion } from 'framer-motion';
import { DailyMatch } from '@/types';
import styles from './Daily.module.css';

interface Props {
  match: DailyMatch;
  onPick: (id: string, w: 1 | 2) => void;
  disabled?: boolean;
}

// Хелпер для парсинга счета "6-4, 2-6" -> ["6", "2"], ["4", "6"]
const parseScores = (scoreStr?: string) => {
    if (!scoreStr) return { p1: [], p2: [] };
    
    // Разбиваем по запятой или пробелу (защита от разных форматов)
    // Flashscore дает "6-4, 6-3"
    const sets = scoreStr.split(',').map(s => s.trim());
    
    const p1Scores: string[] = [];
    const p2Scores: string[] = [];

    sets.forEach(set => {
        // Ищем паттерн "Цифра(опц)-Цифра(опц)"
        // Пример: "6-4" или "7(7)-6(5)"
        // Разбиваем по последнему тире, если их несколько (тайбрейк)
        // Но простой split('-') обычно работает для тенниса ок
        const parts = set.split('-');
        if (parts.length >= 2) {
            p1Scores.push(parts[0]);
            // Если там есть тайбрейк, он будет внутри строки, например "7(7)"
            p2Scores.push(parts[parts.length - 1]);
        }
    });

    return { p1: p1Scores, p2: p2Scores };
};

// Хелпер для отображения цифры (с поддержкой тайбрейка 7(5))
const ScoreDigit = ({ value, colorClass }: { value: string, colorClass: string }) => {
    const match = value.match(/^(\d+)\s*\((.+)\)$/);
    if (match) {
      return (
        <span className={`${styles.scoreDigit} ${colorClass} flex justify-center items-start leading-none !w-6`}>
          {match[1]}
          <span className="text-[8px] -mt-0.5 ml-[1px] opacity-80">{match[2]}</span>
        </span>
      );
    }
    return <span className={`${styles.scoreDigit} ${colorClass}`}>{value}</span>;
};

export const DailyMatchCard = ({ match, onPick, disabled }: Props) => {
  const { id, player1, player2, start_time, tournament, status, my_pick, winner, score } = match;

  // Парсим счет
  const { p1: p1Scores, p2: p2Scores } = parseScores(score);

  // Определяем стили для Игрока 1
  let p1Status = styles.playerRow;
  if (my_pick === 1) p1Status += ` ${styles.selected}`; // Я выбрал
  if (status === 'COMPLETED' && winner) {
      if (my_pick === 1 && winner === 1) p1Status += ` ${styles.correct}`; // Угадал
      if (my_pick === 1 && winner !== 1) p1Status += ` ${styles.incorrect}`; // Ошибся
  }
  if (disabled) p1Status += ` ${styles.disabled}`;

  // Определяем стили для Игрока 2
  let p2Status = styles.playerRow;
  if (my_pick === 2) p2Status += ` ${styles.selected}`;
  if (status === 'COMPLETED' && winner) {
      if (my_pick === 2 && winner === 2) p2Status += ` ${styles.correct}`;
      if (my_pick === 2 && winner !== 2) p2Status += ` ${styles.incorrect}`;
  }
  if (disabled) p2Status += ` ${styles.disabled}`;

  // Цвет цифр счета
  const getScoreColor = (rowStatus: string) => {
      if (rowStatus.includes(styles.correct)) return styles.scoreCorrect;
      if (rowStatus.includes(styles.incorrect)) return styles.scoreIncorrect;
      if (rowStatus.includes(styles.selected)) return styles.scoreSelected;
      return styles.scoreDefault;
  };

  return (
    <motion.div layout className={styles.cardContainer}>
      
      {/* HEADER: Турнир + Статус */}
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
        className={p1Status} 
        onClick={() => !disabled && onPick(id, 1)}
      >
          <div className={styles.playerName}>
              <span style={{ textDecoration: p1Status.includes(styles.incorrect) ? 'line-through' : 'none' }}>
                  {player1}
              </span>
              {/* Подсказка если ошибся */}
              {status === 'COMPLETED' && my_pick === 1 && winner !== 1 && (
                  <span className="text-[#8E8E93] text-[10px] ml-2 no-underline">→ {player2}</span>
              )}
          </div>
          
          <div className="flex items-center gap-1">
              {p1Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p1Status)} />)}
          </div>
      </div>

      {/* ИГРОК 2 */}
      <div 
        className={p2Status} 
        onClick={() => !disabled && onPick(id, 2)}
      >
          <div className={styles.playerName}>
              <span style={{ textDecoration: p2Status.includes(styles.incorrect) ? 'line-through' : 'none' }}>
                  {player2}
              </span>
              {/* Подсказка если ошибся */}
              {status === 'COMPLETED' && my_pick === 2 && winner !== 2 && (
                  <span className="text-[#8E8E93] text-[10px] ml-2 no-underline">→ {player1}</span>
              )}
          </div>

          <div className="flex items-center gap-1">
              {p2Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p2Status)} />)}
          </div>
      </div>

    </motion.div>
  );
};