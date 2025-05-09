// frontend\src\components\MatchListActive.tsx
'use client';

import { useState, useEffect } from 'react';
import { Match, UserPick } from '@/types';
import styles from './MatchListActive.module.css';

interface BracketMatch {
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string | null;
}

interface MatchListActiveProps {
  matches: Match[];
  picks: UserPick[];
  handlePick: (match: Match, player: string | null) => void;
  savePicks: () => void;
  rounds: string[];
  selectedRound: string | null;
}

export default function MatchListActive({
  matches,
  picks,
  handlePick,
  savePicks,
  rounds,
  selectedRound,
}: MatchListActiveProps) {
  const [bracket, setBracket] = useState<BracketMatch[][]>([]);

  useEffect(() => {
    const generateBracket = () => {
      const matchCounts = [64, 32, 16, 8, 4, 2, 1, 1]; // R128, R64, R32, R16, QF, SF, F, W
      const newBracket: BracketMatch[][] = rounds.map((round, i) => {
        const count = matchCounts[i] || 1;
        return Array(count)
          .fill(null)
          .map((_, matchIdx) => {
            if (i === 0) {
              // Первый раунд из true_draws
              const match = matches.find(
                (m) => m.match_number === matchIdx + 1 && m.round === round
              );
              return match
                ? {
                    round: match.round,
                    match_number: match.match_number,
                    player1: match.player1 || 'TBD',
                    player2: match.player2 || 'TBD',
                    predicted_winner:
                      picks.find(
                        (p) =>
                          p.match_number === match.match_number &&
                          p.round === match.round
                      )?.predicted_winner || null,
                  }
                : {
                    round,
                    match_number: matchIdx + 1,
                    player1: 'TBD',
                    player2: 'TBD',
                    predicted_winner: null,
                  };
            }
            const prevRoundPicks = bracket[i - 1] || [];
            const winner1 = prevRoundPicks[matchIdx * 2]?.predicted_winner;
            const winner2 = prevRoundPicks[matchIdx * 2 + 1]?.predicted_winner;
            const existingPick = picks.find(
              (p) => p.round === round && p.match_number === matchIdx + 1
            );
            return {
              round,
              match_number: matchIdx + 1,
              player1: winner1 || 'TBD',
              player2: winner2 || 'TBD',
              predicted_winner: existingPick?.predicted_winner || null,
            };
          });
      });
      setBracket(newBracket);
    };

    generateBracket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, picks, rounds, selectedRound]);

  const onPick = (match: BracketMatch, player: string) => {
    const roundIdx = rounds.indexOf(match.round);
    const newBracket = [...bracket];
    newBracket[roundIdx][match.match_number - 1].predicted_winner = player;

    // Обновляем следующий раунд
    if (roundIdx < rounds.length - 1) {
      const nextRound = newBracket[roundIdx + 1];
      const nextMatchIdx = Math.floor((match.match_number - 1) / 2);
      if (match.match_number % 2 === 1) {
        nextRound[nextMatchIdx].player1 = player;
      } else {
        nextRound[nextMatchIdx].player2 = player;
      }
      // Очищаем последующие раунды
      for (let i = roundIdx + 2; i < rounds.length; i++) {
        newBracket[i].forEach((m, idx) => {
          const prevMatchIdx = idx * 2;
          m.player1 = newBracket[i - 1][prevMatchIdx]?.predicted_winner || 'TBD';
          m.player2 =
            newBracket[i - 1][prevMatchIdx + 1]?.predicted_winner || 'TBD';
          m.predicted_winner = null;
        });
      }
    }
    setBracket(newBracket);

    // Формируем объект типа Match для handlePick
    const matchForPick: Match = {
      id: match.match_number, // Используем match_number как id
      tournament_id: Number(picks[0]?.tournament_id || 0), // Предполагаем, что tournament_id берётся из picks
      round: match.round,
      match_number: match.match_number,
      player1: match.player1,
      player2: match.player2,
      set1: null,
      set2: null,
      set3: null,
      set4: null,
      set5: null,
      winner: null,
    };
    handlePick(matchForPick, player);
  };

  const renderMatch = (match: BracketMatch, index: number) => (
    <div key={index} className={styles.matchContainer}>
      <div
        className={`${styles.playerCell} ${
          match.predicted_winner === match.player1 ? styles.selectedPlayer : ''
        }`}
        onClick={() => onPick(match, match.player1)}
      >
        {match.player1}
      </div>
      <div className={styles.connector} />
      <div
        className={`${styles.playerCell} ${
          match.predicted_winner === match.player2 ? styles.selectedPlayer : ''
        }`}
        onClick={() => onPick(match, match.player2)}
      >
        {match.player2}
      </div>
    </div>
  );

  return (
    <div className={styles.bracketContainer}>
      {bracket[rounds.indexOf(selectedRound || '')]?.map(renderMatch)}
      <button onClick={savePicks} className={styles.saveButton}>
        Сохранить пики
      </button>
    </div>
  );
}