'use client';

import styles from './Bracket.module.css';
import { Player } from '@/types';

const CheckIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const TrophyIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

interface PlayerRowProps {
  player: Player | { name: string; seed?: number } | null;
  status: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  scores?: string[]; // Массив очков ТОЛЬКО этого игрока (['6', '6'])
  onClick?: () => void;
  showCheck?: boolean;
  showTrophy?: boolean;
  hintName?: string | null;
}

const PlayerRow = ({ player, status, scores, onClick, showCheck, showTrophy, hintName }: PlayerRowProps) => {
  const name = player?.name || 'TBD';
  
  let rowClass = styles.playerRow;
  if (status === 'tbd' || name === 'TBD') rowClass += ` ${styles.tbd}`;
  else if (status === 'selected') rowClass += ` ${styles.selected}`;
  else if (status === 'correct') rowClass += ` ${styles.correct}`;
  else if (status === 'incorrect') rowClass += ` ${styles.incorrect}`;

  // Определяем цвет цифр счета
  const scoreColor = (status === 'selected' || status === 'correct') ? 'text-white' : 'text-[#8E8E93]';

  return (
    <div className={rowClass} onClick={onClick}>
      <div className={styles.playerInfo}>
        {/* ИМЯ */}
        <span className={styles.playerName}>{name}</span>
        
        {/* SEED */}
        {player?.seed && status !== 'tbd' && status !== 'incorrect' && (
            <span className={styles.playerSeed}>[{player.seed}]</span>
        )}

        {/* ПОДСКАЗКА (Правильное имя, если ошиблись) */}
        {/* Важно: e.stopPropagation, чтобы клик по подсказке не считался кликом по игроку */}
        {status === 'incorrect' && hintName && (
            <span className="text-[#8E8E93] text-[11px] ml-2 font-normal whitespace-nowrap opacity-80" style={{ textDecoration: 'none' }}>
               → {hintName}
            </span>
        )}
      </div>
      
      {/* СЧЕТ (Справа, в ряд) */}
      <div className="flex items-center justify-end gap-2 pr-2">
          {scores && scores.map((score, idx) => (
              <span 
                key={idx} 
                className={`font-mono text-[13px] font-bold w-4 text-center ${scoreColor}`}
              >
                  {score}
              </span>
          ))}
      </div>

      {showCheck && <div className={styles.checkIcon}><CheckIcon /></div>}
      {showTrophy && <div className={styles.checkIcon}><TrophyIcon /></div>}
    </div>
  );
};

interface BracketMatchCardProps {
  player1: any;
  player2: any;
  scores?: string[]; // Приходит общий счет ["6-4", "6-3"]
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

  // --- ЛОГИКА РАЗБИЕНИЯ СЧЕТА ---
  // На входе: ["6-4", "7(7)-6(5)"]
  // Нам нужно: P1 -> ["6", "7(7)"], P2 -> ["4", "6(5)"]
  
  const getPlayerScores = (allScores: string[], playerIndex: 0 | 1) => {
      if (!allScores || allScores.length === 0) return [];
      return allScores.map(setScore => {
          if (!setScore || !setScore.includes('-')) return '';
          // Разбиваем строку "6-4" по тире
          // Если тай-брейк "7(7)-6(5)", split тоже сработает корректно по первому разделителю?
          // Нет, split('-') разобьет всё. Надежнее найти разделитель посередине.
          // Но для тенниса обычно формат строгий.
          
          // Простой вариант (если формат строго "X-Y" или "X(N)-Y(M)")
          // Внимание: если счет 6-4, то parts[0]=6, parts[1]=4.
          const parts = setScore.split('-');
          // Если вдруг формат сложный, берем первый и последний элемент
          if (parts.length >= 2) {
             if (playerIndex === 0) return parts[0]; // Счет первого
             return parts[parts.length - 1];         // Счет второго
          }
          return '';
      });
  };

  const p1Scores = getPlayerScores(scores, 0);
  const p2Scores = getPlayerScores(scores, 1);

  if (isChampion) {
      return (
        <div className={styles.championWrapper}>
            <div className={styles.championContainer}>
                <PlayerRow 
                    player={player1} 
                    status={p1Status} 
                    showTrophy={p1Status === 'correct'} 
                    hintName={p1Hint}
                    showCheck={showChecks && p1Status === 'selected'}
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
                scores={p1Scores} // ["6", "6"]
                onClick={onP1Click}
                showCheck={showChecks && p1Status === 'selected'}
                hintName={p1Hint}
            />
            <PlayerRow 
                player={player2} 
                status={p2Status} 
                scores={p2Scores} // ["4", "3"]
                onClick={onP2Click}
                showCheck={showChecks && p2Status === 'selected'}
                hintName={p2Hint}
            />
        </div>

        {showConnector && (
            <div className={styles.connectorWrapper}>
                <div className={styles.connectorTop} />
                <div className={styles.connectorBottom} />
            </div>
        )}
    </div>
  );
};