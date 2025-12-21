'use client';

import styles from './Bracket.module.css';
import { Player } from '@/types';

// --- ИКОНКИ ---
// Галочка (Синяя)
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Трофей (Золотой)
const TrophyIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

interface PlayerRowProps {
  player: Player | { name: string; seed?: number } | null;
  status: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  score?: string;
  onClick?: () => void;
  showCheck?: boolean;    // <--- Флаг для галочки
  showTrophy?: boolean;
  hintName?: string | null;
  isEliminated?: boolean;
}

const PlayerRow = ({ player, status, score, onClick, showCheck, showTrophy, hintName, isEliminated }: PlayerRowProps) => {
  const name = player?.name || 'TBD';
  
  let rowClass = styles.playerRow;
  if (status === 'tbd' || name === 'TBD') rowClass += ` ${styles.tbd}`;
  else if (status === 'selected') rowClass += ` ${styles.selected}`;
  else if (status === 'correct') rowClass += ` ${styles.correct}`;
  else if (status === 'incorrect') rowClass += ` ${styles.incorrect}`;

  const styleObj = isEliminated ? { opacity: 0.5 } : {};

  return (
    <div className={rowClass} onClick={onClick} style={styleObj}>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>{name}</span>
        
        {/* Сид */}
        {player?.seed && status !== 'tbd' && status !== 'incorrect' && (
            <span className={styles.playerSeed}>[{player.seed}]</span>
        )}
        
        {/* Подсказка (стрелка) */}
        {hintName && (
            <div className={styles.correctionText}>
                 → {hintName}
            </div>
        )}
      </div>
      
      {/* Счет */}
      {score && <span className={styles.score}>{score}</span>}
      
      {/* ГАЛОЧКА (Для Active) */}
      {showCheck && <div className={styles.checkIcon}><CheckIcon /></div>}
      
      {/* Трофей (Для Чемпиона) */}
      {showTrophy && <div className={styles.checkIcon}><TrophyIcon /></div>}
    </div>
  );
};

interface BracketMatchCardProps {
  player1: any;
  player2: any;
  scores?: string[];
  p1Status?: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  p2Status?: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  onP1Click?: () => void;
  onP2Click?: () => void;
  showChecks?: boolean; // <--- Передаем глобально для матча
  p1Hint?: string | null;
  p2Hint?: string | null;
  p1Eliminated?: boolean;
  p2Eliminated?: boolean;
  isChampion?: boolean;
  showConnector?: boolean; 
}

export const BracketMatchCard = ({
  player1, player2, scores = [],
  p1Status = 'default', p2Status = 'default',
  onP1Click, onP2Click,
  showChecks = false, // По умолчанию выключено (для Closed)
  p1Hint, p2Hint,
  p1Eliminated, p2Eliminated,
  isChampion = false,
  showConnector = true
}: BracketMatchCardProps) => {

  if (isChampion) {
      // Стиль для чемпиона
      let bgStyle = '#171717';
      if (p1Status === 'correct') bgStyle = 'rgba(48, 209, 88, 0.15)';
      if (p1Status === 'incorrect') bgStyle = 'rgba(255, 69, 58, 0.15)';
      if (p1Status === 'selected') bgStyle = '#152230';

      return (
        <div className={styles.championWrapper}>
            <div className={styles.championContainer}>
                {/* Обертка для стилизации Чемпиона */}
                <div style={{ background: bgStyle, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <PlayerRow 
                        player={player1} 
                        status={p1Status} 
                        showTrophy={p1Status === 'correct'} 
                        hintName={p1Hint}
                    />
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className={styles.matchWrapper}>
        {/* Игроки */}
        <div className={styles.matchContainer}>
            <PlayerRow 
                player={player1} 
                status={p1Status} 
                score={scores[0] ? scores[0].split('-')[0] : ''}
                onClick={onP1Click}
                // Галочку показываем, если режим разрешает (showChecks) И статус выбран (selected)
                showCheck={showChecks && p1Status === 'selected'}
                hintName={p1Hint}
                isEliminated={p1Eliminated}
            />
            <PlayerRow 
                player={player2} 
                status={p2Status} 
                score={scores[0] ? scores[0].split('-')[1] : ''}
                onClick={onP2Click}
                showCheck={showChecks && p2Status === 'selected'}
                hintName={p2Hint}
                isEliminated={p2Eliminated}
            />
        </div>

        {/* Линии (Без второго ряда, просто скобка ]) */}
        {showConnector && (
            <div className={styles.connectorWrapper}>
                <div className={styles.connectorTop} />
                <div className={styles.connectorBottom} />
            </div>
        )}
    </div>
  );
};