'use client';

import styles from './Bracket.module.css';
import { Player } from '@/types';

const CheckIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="#00B2FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const TrophyIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>);

// --- ХЕЛПЕР ДЛЯ ОТОБРАЖЕНИЯ СЧЕТА ---
// Превращает "7(6)" в визуальную структуру с верхним индексом
const ScoreDigit = ({ value, colorClass }: { value: string, colorClass: string }) => {
  // Проверяем, есть ли скобки, например "6(8)" или "7(5)"
  const match = value.match(/^(\d+)\((\d+)\)$/);

  if (match) {
    const mainScore = match[1]; // "6"
    const tieBreak = match[2];  // "8"
    return (
      <span className={`font-mono text-[13px] font-bold w-5 flex justify-center items-start leading-none ${colorClass}`}>
        {mainScore}
        {/* Тай-брейк: маленький шрифт, сдвиг вверх */}
        <span className="text-[9px] -mt-1 ml-[1px] opacity-80">{tieBreak}</span>
      </span>
    );
  }

  // Обычный счет
  return (
    <span className={`font-mono text-[13px] font-bold w-4 text-center ${colorClass}`}>
      {value}
    </span>
  );
};

interface PlayerRowProps {
  player: Player | { name: string; seed?: number } | null;
  status: 'default' | 'selected' | 'correct' | 'incorrect' | 'tbd';
  scores?: string[];
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

  const scoreColor = (status === 'selected' || status === 'correct') ? 'text-white' : 'text-[#8E8E93]';

  return (
    <div 
        className={rowClass} 
        onClick={onClick}
        // ВАЖНО: Принудительно убираем зачеркивание с контейнера, чтобы оно не лезло на Hint
        style={{ textDecoration: 'none' }} 
    >
      <div className={styles.playerInfo}>
        {/* ИМЯ: Зачеркиваем только его, если статус incorrect */}
        <span 
            className={styles.playerName}
            style={{ textDecoration: status === 'incorrect' ? 'line-through' : 'none' }}
        >
            {name}
        </span>
        
        {player?.seed && status !== 'tbd' && status !== 'incorrect' && (
            <span className={styles.playerSeed}>[{player.seed}]</span>
        )}

        {/* ПОДСКАЗКА: Обычный текст без зачеркивания */}
        {status === 'incorrect' && hintName && (
            <span className="text-[#8E8E93] text-[11px] ml-2 font-normal whitespace-nowrap opacity-100 no-underline">
               → <span className="text-[#bfbfbf]">{hintName}</span>
            </span>
        )}
      </div>
      
      {/* СЧЕТ */}
      <div className="flex items-center gap-1 pr-2">
          {scores && scores.map((score, idx) => (
              <ScoreDigit key={idx} value={score} colorClass={scoreColor} />
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

  // Парсинг счета: "6(8)-0" -> P1="6(8)", P2="0"
  const getPlayerScores = (allScores: string[], playerIndex: 0 | 1) => {
      if (!allScores || allScores.length === 0) return [];
      return allScores.map(setScore => {
          if (!setScore) return '';
          // Проверяем наличие тире (разделителя очков игроков)
          if (!setScore.includes('-')) return '';
          
          const parts = setScore.split('-');
          // Обработка сложных случаев, если вдруг в тай-брейке тоже есть тире (редко, но бывает)
          // Берем первое число для P1 и последнее для P2
          if (parts.length >= 2) {
             if (playerIndex === 0) return parts[0]; 
             return parts[parts.length - 1];         
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
                scores={p1Scores}
                onClick={onP1Click}
                showCheck={showChecks && p1Status === 'selected'}
                hintName={p1Hint}
            />
            <PlayerRow 
                player={player2} 
                status={p2Status} 
                scores={p2Scores}
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