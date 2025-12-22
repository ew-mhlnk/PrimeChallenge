'use client';

import styles from './Bracket.module.css';
import { Player } from '@/types';

// --- ИКОНКИ ---
const CheckIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const TrophyIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

interface PlayerRowProps {
  player: Player | { name: string; seed?: number } | null;
  status: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  score?: string;
  onClick?: () => void;
  showCheck?: boolean;
  showTrophy?: boolean;
  hintName?: string | null;
}

const PlayerRow = ({ player, status, score, onClick, showCheck, showTrophy, hintName }: PlayerRowProps) => {
  const name = player?.name || 'TBD';
  
  let rowClass = styles.playerRow;
  if (status === 'tbd' || name === 'TBD') rowClass += ` ${styles.tbd}`;
  else if (status === 'selected') rowClass += ` ${styles.selected}`;
  else if (status === 'correct') rowClass += ` ${styles.correct}`;
  else if (status === 'incorrect') rowClass += ` ${styles.incorrect}`;

  return (
    <div className={rowClass} onClick={onClick}>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>{name}</span>
        {player?.seed && status !== 'tbd' && status !== 'incorrect' && (
            <span className={styles.playerSeed}>[{player.seed}]</span>
        )}
        {hintName && (
            <span className={styles.correctionText}>→ {hintName}</span>
        )}
      </div>
      
      {score && <span className={styles.score}>{score}</span>}
      {showCheck && <div className={styles.checkIcon}><CheckIcon /></div>}
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
  showChecks?: boolean;
  p1Hint?: string | null;
  p2Hint?: string | null;
  isChampion?: boolean;
  showConnector?: boolean; 
}

export const BracketMatchCard = ({
  player1, player2, scores = [],
  p1Status = 'default', p2Status = 'default',
  onP1Click, onP2Click,
  showChecks = false,
  p1Hint, p2Hint,
  isChampion = false,
  showConnector = true
}: BracketMatchCardProps) => {

  if (isChampion) {
      // Для чемпиона используем стиль "Correct" или "Selected" как базу
      let rowClass = styles.playerRow;
      if (p1Status === 'correct') rowClass += ` ${styles.correct}`;
      else if (p1Status === 'selected') rowClass += ` ${styles.selected}`;
      else rowClass += ` ${styles.tbd}`;

      return (
        <div className={styles.championWrapper}>
            <div className={styles.championContainer}>
                {/* Оборачиваем в div, чтобы задать отступы и бордер */}
                <div className={rowClass} style={{ justifyContent: 'center' }}>
                     <div className={styles.playerInfo}>
                        <span className={styles.playerName}>{player1?.name || 'TBD'}</span>
                        {p1Hint && <span className={styles.correctionText}>→ {p1Hint}</span>}
                     </div>
                     {p1Status === 'correct' && <div className={styles.checkIcon}><TrophyIcon /></div>}
                </div>
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
            />
            <PlayerRow 
                player={player2} 
                status={p2Status} 
                score={scores[0] ? scores[0].split('-')[1] : ''}
                onClick={onP2Click}
                showCheck={showChecks && p2Status === 'selected'}
                hintName={p2Hint}
            />
        </div>

        {/* ЛИНИИ БЕЗ MARGIN */}
        {showConnector && (
            <div className={styles.connectorWrapper}>
                <div className={styles.connectorTop} />
                {/* <div className={styles.connectorNode} /> */} {/* Узелок по центру, если нужен */}
                <div className={styles.connectorBottom} />
            </div>
        )}
    </div>
  );
};