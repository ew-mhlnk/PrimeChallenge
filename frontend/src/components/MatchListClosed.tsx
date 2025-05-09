// frontend\src\components\MatchListClosed.tsx
'use client';

import { Match, UserPick, ComparisonResult } from '@/types';
import styles from './MatchListClosed.module.css';

interface MatchListClosedProps {
  matches: Match[];
  picks: UserPick[];
  comparison: ComparisonResult[];
}

export default function MatchListClosed({ matches, picks, comparison }: MatchListClosedProps) {
  const renderMatch = (match: Match, index: number) => {
    const userPick = picks.find(p => p.round === match.round && p.match_number === match.match_number);
    const compResult = comparison.find(c => c.round === match.round && c.match_number === match.match_number);

    const isCorrect = compResult?.correct;
    const isIncorrect = compResult && !compResult.correct;

    return (
      <div key={index} className={styles.matchContainer}>
        <div
          className={`${styles.playerCell} ${isCorrect && compResult?.actual_winner === match.player1 ? styles.correctPick : ''} ${isIncorrect && userPick?.predicted_winner === match.player1 ? styles.incorrectPick : ''} ${userPick?.predicted_winner === match.player1 ? styles.selectedPlayer : ''}`}
        >
          {match.player1 || 'TBD'} {match.set1 && `(${match.set1} ${match.set2 || ''} ${match.set3 || ''})`}
        </div>
        <div className={styles.connector} />
        <div
          className={`${styles.playerCell} ${isCorrect && compResult?.actual_winner === match.player2 ? styles.correctPick : ''} ${isIncorrect && userPick?.predicted_winner === match.player2 ? styles.incorrectPick : ''} ${userPick?.predicted_winner === match.player2 ? styles.selectedPlayer : ''}`}
        >
          {match.player2 || 'TBD'} {match.set1 && `(${match.set1} ${match.set2 || ''} ${match.set3 || ''})`}
        </div>
        {isIncorrect && compResult?.actual_winner && (
          <div className={styles.actualWinner}>
            Фактический победитель: {compResult.actual_winner}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.bracketContainer}>
      {matches.map(renderMatch)}
    </div>
  );
}