'use client';

import styles from './Bracket.module.css';
import { Player } from '@/types';

// --- ИКОНКИ ---
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const TrophyIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

// --- ИНТЕРФЕЙС СТРОКИ ИГРОКА ---
interface PlayerRowProps {
  player: Player | { name: string; seed?: number } | null;
  status: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  score?: string;
  onClick?: () => void;
  showCheck?: boolean;
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
        {player?.seed && status !== 'tbd' && status !== 'incorrect' && (
            <span className={styles.playerSeed}>[{player.seed}]</span>
        )}
        {hintName && (
            <span className="text-[10px] text-[#8E8E93] ml-2">→ {hintName}</span>
        )}
      </div>
      
      {score && <span className={styles.score}>{score}</span>}
      
      {showCheck && <div className={styles.checkIcon}><CheckIcon /></div>}
      {showTrophy && <div className={styles.checkIcon}><TrophyIcon /></div>}
    </div>
  );
};

// --- ИНТЕРФЕЙС КАРТОЧКИ (ТУТ БЫЛА ОШИБКА) ---
interface BracketMatchCardProps {
  player1: any;
  player2: any;
  scores?: string[];
  
  p1Status?: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  p2Status?: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  
  onP1Click?: () => void;
  onP2Click?: () => void;
  
  showChecks?: boolean;
  p1Hint?: string | null;
  p2Hint?: string | null;
  p1Eliminated?: boolean;
  p2Eliminated?: boolean;
  
  isChampion?: boolean;
  
  // ВАЖНО: Добавили это поле, чтобы TS не ругался
  showConnector?: boolean; 
}

export const BracketMatchCard = ({
  player1, player2, scores = [],
  p1Status = 'default', p2Status = 'default',
  onP1Click, onP2Click,
  showChecks = false,
  p1Hint, p2Hint,
  p1Eliminated, p2Eliminated,
  isChampion = false,
  showConnector = true // Значение по умолчанию
}: BracketMatchCardProps) => {

  if (isChampion) {
      let bgStyle = '#1E1E1E';
      if (p1Status === 'correct') bgStyle = 'rgba(48, 209, 88, 0.15)';
      if (p1Status === 'incorrect') bgStyle = 'rgba(255, 69, 58, 0.15)';
      if (p1Status === 'selected') bgStyle = '#152230';

      return (
        <div className={styles.championWrapper}>
            <div className={styles.championContainer} style={{ border: 'none', background: bgStyle }}>
                <PlayerRow 
                    player={player1} 
                    status={p1Status} 
                    showTrophy={p1Status === 'correct'} 
                    hintName={p1Hint}
                />
            </div>
        </div>
      );
  }

  return (
    <div className={styles.matchWrapper}>
        <div className={styles.matchContainer}>
            <PlayerRow 
                player={player1} 
                status={p1Status} 
                score={scores[0] ? scores[0].split('-')[0] : ''}
                onClick={onP1Click}
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

        {/* Линии (Connectors) */}
        {showConnector && (
            <div className={styles.bracketConnector}>
                <div className={styles.node} />
            </div>
        )}
    </div>
  );
};