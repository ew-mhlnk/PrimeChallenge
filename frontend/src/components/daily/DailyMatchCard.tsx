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
    if (!scoreStr) return { p1: [], p2: [], p1Point: '', p2Point: '' };
    
    let mainScore = scoreStr;
    let p1Point = '';
    let p2Point = '';

    const pointsMatch = scoreStr.match(/\s*\(([^)]+)\)$/);
    if (pointsMatch) {
        const pointsParts = pointsMatch[1].split('-');
        if (pointsParts.length >= 2) {
            p1Point = pointsParts[0];
            p2Point = pointsParts[1];
        }
        mainScore = scoreStr.replace(pointsMatch[0], '');
    }

    const sets = mainScore.split(',').map(s => s.trim()).filter(Boolean);
    const p1Scores: string[] = [];
    const p2Scores: string[] = [];

    sets.forEach(set => {
        const parts = set.split('-');
        if (parts.length >= 2) {
            p1Scores.push(parts[0]);
            p2Scores.push(parts[parts.length - 1]);
        }
    });

    return { p1: p1Scores, p2: p2Scores, p1Point, p2Point };
};

const ScoreDigit = ({ value, colorClass, isPoint = false }: { value: string, colorClass: string, isPoint?: boolean }) => {
    const match = value.match(/^(\d+)\s*\((.+)\)$/);
    if (isPoint) {
        return <span className="font-mono text-[11px] font-bold w-6 text-center text-[#00B2FF] animate-pulse">{value}</span>;
    }
    if (match) {
      const isLong = match[2].length > 2;
      return (
        <span className={`${styles.scoreDigit} ${colorClass} flex justify-center items-start leading-none !w-6`}>
          {match[1]}
          <span className={`ml-[1px] opacity-80 whitespace-nowrap ${isLong ? 'text-[7px] -mt-0.5 tracking-tighter' : 'text-[8px] -mt-0.5'}`}>
            {match[2]}
          </span>
        </span>
      );
    }
    return <span className={`${styles.scoreDigit} ${colorClass}`}>{value}</span>;
};

export const DailyMatchCard = ({ match, onPick, disabled }: Props) => {
  const { id, player1, player2, start_time, tournament, status, my_pick, winner, score } = match;
  const { p1: p1Scores, p2: p2Scores, p1Point, p2Point } = parseScores(score);

  const safeStatus = status?.toUpperCase() || 'PLANNED';
  const myPickNum = Number(my_pick);
  const winnerNum = Number(winner);

  // --- ВРЕМЯ (ПРОСТО ОТОБРАЖАЕМ СТРОКУ) ---
  // Если время 12:00 (наша заглушка) и матч уже идет/завершен -> скрываем время
  let displayTime = start_time;
  if (start_time === '12:00' && (safeStatus === 'LIVE' || safeStatus === 'COMPLETED')) {
       displayTime = ""; 
  }

  const getPlayerStatus = (playerNum: 1 | 2) => {
      const isSelected = myPickNum === playerNum;
      if (safeStatus === 'COMPLETED' && winnerNum > 0) {
          if (isSelected && winnerNum === playerNum) return 'correct';
          if (isSelected && winnerNum !== playerNum) return 'incorrect';
          return 'default';
      }
      if (isSelected) return 'selected';
      return 'default';
  };

  const p1Stat = getPlayerStatus(1);
  const p2Stat = getPlayerStatus(2);

  const getRowClass = (st: string) => {
      let cls = styles.playerRow;
      if (st === 'selected') cls += ` ${styles.selected}`;
      if (st === 'correct') cls += ` ${styles.correct}`;
      if (st === 'incorrect') cls += ` ${styles.incorrect}`;
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
      <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-nowrap truncate max-w-[200px]">
                {tournament}
            </span>
            <span className="text-[11px] font-medium text-[#5F6067] whitespace-nowrap">
                {displayTime}
            </span>
          </div>
          
          {safeStatus === 'LIVE' && <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">LIVE</span>}
          {safeStatus === 'COMPLETED' && <span className="text-[9px] text-[#5F6067] font-bold uppercase">Завершен</span>}
          {safeStatus === 'CANCELLED' && <span className="text-[9px] text-[#FF453A] font-bold uppercase">Отменен</span>}
      </div>

      {/* ИГРОК 1 */}
      <div className={getRowClass(p1Stat)} onClick={() => !disabled && onPick(id, 1)} style={{ textDecoration: 'none' }}>
          <div className={styles.playerName}>
              <span style={{ textDecoration: p1Stat === 'incorrect' ? 'line-through' : 'none' }}>{player1}</span>
              {p1Stat === 'incorrect' && winnerNum === 2 && <span className="text-[#8E8E93] text-[10px] ml-2 no-underline opacity-80">→ {player2}</span>}
          </div>
          <div className="flex items-center gap-1">
              {p1Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p1Stat)} />)}
              {p1Point && <ScoreDigit value={p1Point} colorClass="" isPoint={true} />}
          </div>
      </div>

      {/* ИГРОК 2 */}
      <div className={getRowClass(p2Stat)} onClick={() => !disabled && onPick(id, 2)} style={{ textDecoration: 'none' }}>
          <div className={styles.playerName}>
              <span style={{ textDecoration: p2Stat === 'incorrect' ? 'line-through' : 'none' }}>{player2}</span>
              {p2Stat === 'incorrect' && winnerNum === 1 && <span className="text-[#8E8E93] text-[10px] ml-2 no-underline opacity-80">→ {player1}</span>}
          </div>
          <div className="flex items-center gap-1">
              {p2Scores.map((s, i) => <ScoreDigit key={i} value={s} colorClass={getScoreColor(p2Stat)} />)}
              {p2Point && <ScoreDigit value={p2Point} colorClass="" isPoint={true} />}
          </div>
      </div>
    </motion.div>
  );
};