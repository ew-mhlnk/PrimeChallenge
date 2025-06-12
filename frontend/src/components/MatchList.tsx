// frontend/src/components/MatchList.tsx
'use client';

import { TournamentStatus, BracketMatch, Comparison } from '../types';

interface MatchListProps {
  round: string;
  matches: { [key: string]: BracketMatch };
  tournamentStatus: TournamentStatus;
  comparison: Comparison[];
  onPlayerClick: (round: string, matchNumber: number, player: string) => void;
}

export default function MatchList({
  round,
  matches,
  tournamentStatus,
  comparison,
  onPlayerClick,
}: MatchListProps) {
  return (
    <div className="space-y-4">
      {Object.entries(matches).map(([matchNum, match]) => {
        const matchNumber = parseInt(matchNum);
        const comp = comparison.find(
          (c) => c.round === round && c.match_number === matchNumber
        );

        return (
          <div key={matchNum} className="border p-4 rounded">
            <p className="font-semibold">
              {match.player1 || 'TBD'} vs {match.player2 || 'TBD'}
            </p>
            {tournamentStatus === TournamentStatus.ACTIVE ? (
              <div className="flex space-x-2 mt-2">
                <button
                  onClick={() => match.player1 && onPlayerClick(round, matchNumber, match.player1)}
                  disabled={!match.player1 || tournamentStatus !== TournamentStatus.ACTIVE}
                  className={`px-4 py-2 rounded ${
                    match.predicted_winner === match.player1
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {match.player1 || 'TBD'}
                </button>
                <button
                  onClick={() => match.player2 && onPlayerClick(round, matchNumber, match.player2)}
                  disabled={!match.player2 || tournamentStatus !== TournamentStatus.ACTIVE}
                  className={`px-4 py-2 rounded ${
                    match.predicted_winner === match.player2
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {match.player2 || 'TBD'}
                </button>
              </div>
            ) : (
              <div className="mt-2">
                {match.predicted_winner && (
                  <p>Ваш выбор: {match.predicted_winner}</p>
                )}
                {comp && comp.actual_winner && (
                  <p
                    className={
                      comp.correct ? 'text-green-500' : 'text-red-500'
                    }
                  >
                    Результат: {comp.actual_winner} (
                    {comp.correct ? 'Верно' : 'Неверно'})
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}