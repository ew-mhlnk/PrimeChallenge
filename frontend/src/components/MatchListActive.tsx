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
    console.log('MatchListActive useEffect:', { selectedRound, bracket }); // Отладка
    if (!selectedRound || !bracket[selectedRound]) {
      console.log(`No matches for round ${selectedRound}`, { bracket }); // Отладка
      setDisplayBracket([]);
      return;
    }

    const matches = bracket[selectedRound].map((match) => {
      console.log('Processing match:', JSON.stringify(match, null, 2)); // Отладка
      return {
        round: selectedRound,
        matchId: match.id,
        match,
      };
    });
    console.log('Display bracket:', JSON.stringify(matches, null, 2)); // Отладка
    setDisplayBracket(matches);
  }, [selectedRound, bracket]);

  const renderMatch = (item: {
    round: string;
    matchId: string;
    match: BracketMatch;
  }) => {
    const { round, matchId, match } = item;
    console.log('Rendering match:', JSON.stringify(match, null, 2)); // Отладка

    const player1Name =
      match.player1 &&
      typeof match.player1 === 'object' &&
      'name' in match.player1 &&
      typeof match.player1.name === 'string' &&
      match.player1.name
        ? `${match.player1.name}${match.player1.seed != null ? ` (${match.player1.seed})` : ''}`
        : 'TBD';
    const player2Name =
      match.player2 &&
      typeof match.player2 === 'object' &&
      'name' in match.player2 &&
      typeof match.player2.name === 'string' &&
      match.player2.name
        ? `${match.player2.name}${match.player2.seed != null ? ` (${match.player2.seed})` : ''}`
        : 'TBD';

    console.log('player1Name:', player1Name, typeof player1Name); // Отладка
    console.log('player2Name:', player2Name, typeof player2Name); // Отладка

    return (
      <div key={matchId} className={styles.matchContainer}>
        <div
          className={`${styles.playerCell} ${match.predicted_winner === match.player1?.name ? styles.selectedPlayer : ''} ${player1Name === 'TBD' ? styles.tbd : ''}`}
          onClick={() => match.player1?.name && match.player1.name !== 'TBD' && handlePick(round, matchId, match.player1.name)}
        >
          {typeof player1Name === 'string' ? player1Name : 'TBD'}
        </div>
        <div className={styles.connector} />
        <div
          className={`${styles.playerCell} ${match.predicted_winner === match.player2?.name ? styles.selectedPlayer : ''} ${player2Name === 'TBD' ? styles.tbd : ''}`}
          onClick={() => match.player2?.name && match.player2.name !== 'TBD' && handlePick(round, matchId, match.player2.name)}
        >
          {typeof player2Name === 'string' ? player2Name : 'TBD'}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.bracketContainer}>
      {displayBracket.length > 0 ? (
        displayBracket.map((item) => (
          <div key={item.matchId}>{renderMatch(item)}</div>
        ))
      ) : (
        <p>Нет матчей для отображения</p>
      )}
    </div>
  );
}