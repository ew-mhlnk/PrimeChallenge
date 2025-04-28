'use client';

import { UserPick, ComparisonResult } from '@/types'; // Используем UserPick

interface MatchListProps {
  picks: UserPick[]; // Используем UserPick
  round: string;
  comparison: ComparisonResult[];
  handlePick: (match: UserPick, player: string | null) => void; // Используем UserPick
  canEdit: boolean; // Флаг, можно ли редактировать пики
}

export default function MatchList({ picks, round, comparison, handlePick, canEdit }: MatchListProps) {
  const matches = picks.filter((pick) => pick.round === round);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((match) => {
        // Находим сравнение для этого матча
        const matchComparison = comparison.find(
          (comp) => comp.round === match.round && comp.match_number === match.match_number
        );

        // Определяем, кто проиграл (для вычеркивания)
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
              {/* Игрок 1 */}
              <div
                className={`cursor-pointer p-2 rounded ${
                  match.predicted_winner === match.player1
                    ? 'bg-green-500'
                    : loser === match.player1
                    ? 'line-through text-gray-500'
                    : 'bg-gray-600'
                } ${!canEdit || !match.player1 ? 'pointer-events-none' : ''}`}
                onClick={() =>
                  canEdit && match.player1 && handlePick(match, match.predicted_winner === match.player1 ? null : match.player1)
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
              {/* Игрок 2 */}
              <div
                className={`cursor-pointer p-2 rounded ${
                  match.predicted_winner === match.player2
                    ? 'bg-green-500'
                    : loser === match.player2
                    ? 'line-through text-gray-500'
                    : 'bg-gray-600'
                } ${!canEdit || !match.player2 ? 'pointer-events-none' : ''}`}
                onClick={() =>
                  canEdit && match.player2 && handlePick(match, match.predicted_winner === match.player2 ? null : match.player2)
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