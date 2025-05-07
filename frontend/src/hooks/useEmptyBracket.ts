import { useState, useEffect } from 'react';
import { Match, UserPick } from '@/types';

interface UseEmptyBracketProps {
  tournamentId: number;
  startingRound: string;
  allRounds: string[];
  userId: number;
}

export const useEmptyBracket = ({ tournamentId, startingRound, allRounds, userId }: UseEmptyBracketProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStartingRoundMatches = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) throw new Error('Telegram initData not available');

        const response = await fetch(`https://primechallenge.onrender.com/tournament/${tournamentId}`, {
          headers: { Authorization: initData },
        });
        if (!response.ok) throw new Error('Failed to load tournament data');
        const data = await response.json();

        const startingMatches = data.true_draws.filter((match: Match) => match.round === startingRound);
        setMatches(startingMatches);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    if (tournamentId && startingRound) {
      fetchStartingRoundMatches();
    }
  }, [tournamentId, startingRound]);

  const generateEmptyPicks = (): UserPick[] => {
    const picks: UserPick[] = [];
    const roundIndex = allRounds.indexOf(startingRound);
    let matchCount = matches.length;

    for (let i = roundIndex; i < allRounds.length; i++) {
      const round = allRounds[i];

      for (let matchNum = 1; matchNum <= matchCount; matchNum++) {
        if (i === roundIndex) {
          const match = matches.find(m => m.match_number === matchNum && m.round === round);
          if (match) {
            picks.push({
              id: match.id,
              user_id: userId,
              tournament_id: tournamentId,
              round,
              match_number: match.match_number,
              player1: match.player1 || '',
              player2: match.player2 || '',
              predicted_winner: null,
            });
          }
        } else {
          picks.push({
            id: -1, // temporary ID
            user_id: userId,
            tournament_id: tournamentId,
            round,
            match_number: matchNum,
            player1: '',
            player2: '',
            predicted_winner: null,
          });
        }
      }

      matchCount = Math.ceil(matchCount / 2);
    }

    return picks;
  };

  return { generateEmptyPicks, error };
};
