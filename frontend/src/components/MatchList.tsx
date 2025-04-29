'use client';

import { UserPick, ComparisonResult } from '@/types';

interface MatchListProps {
  picks: UserPick[];
  round: string;
  comparison: ComparisonResult[];
  handlePick: (match: UserPick, player: string | null) => void;
  canEdit: boolean;
}

export default function MatchList({ picks, round, comparison, handlePick, canEdit }: MatchListProps) {
  const roundPicks = picks.filter((pick) => pick.round === round);

  return (
    <div className="space-y-[20px] flex flex-col items-center">
      {roundPicks.map((pick) => {
        const matchComparison = comparison.find(
          (comp) => comp.round === pick.round && comp.match_number === pick.match_number
        );
        const loser =
          matchComparison && matchComparison.actual_winner
            ? matchComparison.actual_winner === pick.player1
              ? pick.player2
              : pick.player1
            : null;

        return (
          <div
            key={`${pick.round}-${pick.match_number}`}
            className="w-[330px] max-w-[90vw] h-[93px] bg-gradient-to-r from-[#1B1A1F] to-[#161616] rounded-[10px] border border-[rgba(255,255,255,0.18)] relative"
          >
            <p className="absolute top-[10px] left-[10px] text-[16px] font-semibold text-[#FFFFFF]">
              Матч #{pick.match_number}
            </p>
            <div className="absolute top-[35px] left-[10px] flex flex-col space-y-1">
              <div
                className={`cursor-pointer ${
                  pick.predicted_winner === pick.player1
                    ? 'text-green-500'
                    : loser === pick.player1
                    ? 'line-through text-gray-500'
                    : 'text-[#FFFFFF]'
                } ${!canEdit || !pick.player1 ? 'pointer-events-none' : ''}`}
                onClick={() =>
                  canEdit &&
                  pick.player1 &&
                  handlePick(pick, pick.predicted_winner === pick.player1 ? null : pick.player1)
                }
              >
                {pick.player1 || 'TBD'}
                {loser === pick.player1 && matchComparison && (
                  <span className="ml-2 text-red-500">({matchComparison.actual_winner})</span>
                )}
              </div>
              <div
                className={`cursor-pointer ${
                  pick.predicted_winner === pick.player2
                    ? 'text-green-500'
                    : loser === pick.player2
                    ? 'line-through text-gray-500'
                    : 'text-[#FFFFFF]'
                } ${!canEdit || !pick.player2 ? 'pointer-events-none' : ''}`}
                onClick={() =>
                  canEdit &&
                  pick.player2 &&
                  handlePick(pick, pick.predicted_winner === pick.player2 ? null : pick.player2)
                }
              >
                {pick.player2 || 'TBD'}
                {loser === pick.player2 && matchComparison && (
                  <span className="ml-2 text-red-500">({matchComparison.actual_winner})</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}