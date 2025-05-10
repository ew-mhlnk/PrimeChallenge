'use client';

import { ComparisonResult, BracketMatch } from '@/types';
import styles from './MatchListClosed.module.css';

interface MatchListClosedProps {
  bracket: { [round: string]: { [matchNumber: number]: BracketMatch } };
  comparison: ComparisonResult[];
  selectedRound: string | null;
}

export default function MatchListClosed({ bracket, comparison, selectedRound }: MatchListClosedProps) {
  if (!selectedRound || !bracket[selectedRound]) return null;

  const matches = Object.entries(bracket[selectedRound]).map(([matchNum, match]) => ({
    round: selectedRound,
    matchNumber: parseInt(matchNum),
    match,
  }));

  const renderMatch = (item: { round: string; matchNumber: number; match: BracketMatch }) => {
    const { round, matchNumber, match } = item;
    const compResult = comparison.find(c => c.round === round && c.match_number === matchNumber);

    const isCorrect = compResult?.correct;
    const isIncorrect = compResult && !compResult.correct;

    return (
      <div key={`${round}-${matchNumber}`} className={styles.matchContainer}>
        <div
          className={`${styles.playerCell} ${
            isCorrect && compResult?.actual_winner === match.player1 ? styles.correctPick : ''
          } ${
            isIncorrect && match.predicted_winner === match.player1 ? styles.incorrectPick : ''
          } ${
            match.predicted_winner === match.player1 ? styles.selectedPlayer : ''
          }`}
        >
          {match.player1 || 'TBD'}
        </div>
        <div className={styles.connector} />
        <div
          className={`${styles.playerCell} ${
            isCorrect && compResult?.actual_winner === match.player2 ? styles.correctPick : ''
          } ${
            isIncorrect && match.predicted_winner === match.player2 ? styles.incorrectPick : ''
          } ${
            match.predicted_winner === match.player2 ? styles.selectedPlayer : ''
          }`}
        >
          {match.player2 || 'TBD'}
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