'use client';

import { UserPick, ComparisonResult, Match } from '@/types';

interface MatchListProps {
  matches: Match[];
  picks: UserPick[];
  round: string;
  comparison: ComparisonResult[];
  handlePick: (match: Match, player: string | null) => void;
  canEdit: boolean;
}

export default function MatchList({ matches, picks, round, comparison, handlePick, canEdit }: MatchListProps) {
  const roundMatches = matches.filter((match) => match.round === round);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {roundMatches.map((match) => {
        const matchComparison = comparison.find(
          (comp) => comp.round === match.round && comp.match_number === match.match_number
        );
        const userPick = picks.find(
          (pick) => pick.round === match.round && pick.match_number === match.match_number
        );

        const loser =
          matchComparison && matchComparison.actual_winner
            ? matchComparison.actual_winner === match.player1
              ? match.player2
              : match.player1
            : null;

        return (
          <div key={`${match.round}-${match.match_number}`} className="bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold">Матч {match.match_number}</h3>
            <div className="flex justify-between items-center">
              <div
                className={`cursor-pointer p-2 rounded ${
                  userPick?.predicted_winner === match.player1
                    ? 'bg-green-500'
                    : loser === match.player1
                    ? 'line-through text-gray-500'
                    : 'bg-gray-600'
                } ${!canEdit || !match.player1 ? 'pointer-events-none' : ''}`}
                onClick={() =>
                  canEdit && match.player1 && handlePick(match, userPick?.predicted_winner === match.player1 ? null : match.player1)
                }
              >
                {match.player1 || 'TBD'}
                {loser === match.player1 && matchComparison && (
                  <span className="ml-2 text-red-500">
                    ({matchComparison.actual_winner})
                  </span>
                )}
              </div>
              <span className="text-gray-400">vs</span>
              <div
                className={`cursor-pointer p-2 rounded ${
                  userPick?.predicted_winner === match.player2
                    ? 'bg-green-500'
                    : loser === match.player2
                    ? 'line-through text-gray-500'
                    : 'bg-gray-600'
                } ${!canEdit || !match.player2 ? 'pointer-events-none' : ''}`}
                onClick={() =>
                  canEdit && match.player2 && handlePick(match, userPick?.predicted_winner === match.player2 ? null : match.player2)
                }
              >
                {match.player2 || 'TBD'}
                {loser === match.player2 && matchComparison && (
                  <span className="ml-2 text-red-500">
                    ({matchComparison.actual_winner})
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}