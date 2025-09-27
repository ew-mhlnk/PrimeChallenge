'use client';

import { useState, useEffect } from 'react';
import styles from './MatchListActive.module.css';

interface BracketMatch {
  id: string;
  player1: { name: string; seed?: number | null } | null;
  player2: { name: string; seed?: number | null } | null;
  predicted_winner?: string | null;
  source_matches?: Array<{ round: string; match_number: number }>;
}

interface MatchListActiveProps {
  bracket: { [round: string]: BracketMatch[] };
  handlePick: (round: string, matchId: string, player: string) => void;
  selectedRound: string | null;
}

export default function MatchListActive({
  bracket,
  handlePick,
  selectedRound,
}: MatchListActiveProps) {
  const [displayBracket, setDisplayBracket] = useState<
    Array<{
      round: string;
      matchId: string;
      match: BracketMatch;
    }>
  >([]);

  useEffect(() => {
    if (!selectedRound || !bracket[selectedRound]) {
      console.log(`No matches for round ${selectedRound}`, { bracket }); // Отладка
      setDisplayBracket([]);
      return;
    }

    const matches = bracket[selectedRound].map((match) => {
      console.log('Processing match:', match); // Отладка
      return {
        round: selectedRound,
        matchId: match.id,
        match,
      };
    });
    console.log('Display bracket:', matches); // Отладка
    setDisplayBracket(matches);
  }, [selectedRound, bracket]);

  const renderMatch = (item: {
    round: string;
    matchId: string;
    match: BracketMatch;
  }) => {
    const { round, matchId, match } = item;
    const player1Name = match.player1?.name
      ? `${match.player1.name}${match.player1.seed ? ` (${match.player1.seed})` : ''}`
      : 'TBD';
    const player2Name = match.player2?.name
      ? `${match.player2.name}${match.player2.seed ? ` (${match.player2.seed})` : ''}`
      : 'TBD';

    return (
      <div key={matchId} className={styles.matchContainer}>
        <div
          className={`${styles.playerCell} ${match.predicted_winner === match.player1?.name ? styles.selectedPlayer : ''} ${match.player1?.name === 'TBD' ? styles.tbd : ''}`}
          onClick={() => match.player1?.name && match.player1.name !== 'TBD' && handlePick(round, matchId, match.player1.name)}
        >
          {player1Name}
        </div>
        <div className={styles.connector} />
        <div
          className={`${styles.playerCell} ${match.predicted_winner === match.player2?.name ? styles.selectedPlayer : ''} ${match.player2?.name === 'TBD' ? styles.tbd : ''}`}
          onClick={() => match.player2?.name && match.player2.name !== 'TBD' && handlePick(round, matchId, match.player2.name)}
        >
          {player2Name}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.bracketContainer}>
      {displayBracket.length > 0 ? (
        displayBracket.map(renderMatch)
      ) : (
        <p>Нет матчей для отображения</p>
      )}
    </div>
  );
}