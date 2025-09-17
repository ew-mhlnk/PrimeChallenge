'use client';

import { useState, useEffect } from 'react';
import styles from './MatchListActive.module.css';

interface MatchListActiveProps {
  bracket: { [round: string]: Array<{ id: string; player1: { name: string; seed?: number }; player2: { name: string; seed?: number }; predicted_winner?: string | null; source_matches: Array<{ round: string; match_number: number }> }> };
  handlePick: (round: string, matchId: string, player: string) => void;
  savePicks: () => void;
  selectedRound: string | null;
}

export default function MatchListActive({
  bracket,
  handlePick,
  savePicks,
  selectedRound,
}: MatchListActiveProps) {
  const [displayBracket, setDisplayBracket] = useState<Array<{ round: string; matchId: string; match: { id: string; player1: { name: string; seed?: number }; player2: { name: string; seed?: number }; predicted_winner?: string | null; source_matches: Array<{ round: string; match_number: number }> } }>>([]);

  useEffect(() => {
    if (!selectedRound || !bracket[selectedRound]) return;

    const matches = bracket[selectedRound].map((match) => ({
      round: selectedRound,
      matchId: match.id,
      match,
    }));
    setDisplayBracket(matches);
  }, [selectedRound, bracket]);

  const renderMatch = (item: { round: string; matchId: string; match: { id: string; player1: { name: string; seed?: number }; player2: { name: string; seed?: number }; predicted_winner?: string | null; source_matches: Array<{ round: string; match_number: number }> } }) => {
    const { round, matchId, match } = item;
    const player1Name = match.player1.name + (match.player1.seed ? ` (${match.player1.seed})` : '');
    const player2Name = match.player2.name + (match.player2.seed ? ` (${match.player2.seed})` : '');

    return (
      <div key={matchId} className={styles.matchContainer}>
        <div
          className={`${styles.playerCell} ${match.predicted_winner === match.player1.name ? styles.selectedPlayer : ''}`}
          onClick={() => match.player1.name !== 'TBD' && handlePick(round, matchId, match.player1.name)}
        >
          {player1Name}
        </div>
        <div className={styles.connector} />
        <div
          className={`${styles.playerCell} ${match.predicted_winner === match.player2.name ? styles.selectedPlayer : ''}`}
          onClick={() => match.player2.name !== 'TBD' && handlePick(round, matchId, match.player2.name)}
        >
          {player2Name}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.bracketContainer}>
      {displayBracket.map(renderMatch)}
      <button onClick={savePicks} className={styles.saveButton}>
        Сохранить пики
      </button>
    </div>
  );
}