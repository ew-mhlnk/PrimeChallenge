'use client';

import { UserPick, ComparisonResult } from '@/types';

interface MatchListProps {
  picks: UserPick[];
  round: string;
  comparison: ComparisonResult[];
  handlePick: (match: UserPick, player: string | null) => void;
  canEdit: boolean;
  styles: { [key: string]: string };
}

export default function MatchList({ picks, round, comparison, handlePick, canEdit, styles }: MatchListProps) {
  const roundPicks = picks
    .filter((pick) => pick.round === round)
    .sort((a, b) => a.match_number - b.match_number);
  const comparisonMap = new Map(comparison.map(comp => [`${comp.round}-${comp.match_number}`, comp]));

  return (
    <div className="space-y-[20px] flex flex-col items-center">
      {roundPicks.map((pick) => {
        const matchComparison = comparisonMap.get(`${pick.round}-${pick.match_number}`);
        const actualWinner = matchComparison?.actual_winner || '';
        const isCorrect = matchComparison?.predicted_winner === matchComparison?.actual_winner;

        const displayPlayer1 = pick.player1 || '';
        const displayPlayer2 = pick.player2 || '';

        const isWinnerRound = round === 'W';
        const winner = isWinnerRound
          ? (actualWinner || pick.predicted_winner || pick.player1 || '')
          : null;

        // Цвета ячеек
        const player1Class = !canEdit && matchComparison
          ? isCorrect && pick.predicted_winner === pick.player1 ? 'bg-green-500'
          : !isCorrect && pick.predicted_winner === pick.player1 ? 'bg-red-500'
          : 'bg-gray-700'
          : pick.predicted_winner === pick.player1 ? 'bg-blue-500'
          : 'bg-gray-700';
        const player2Class = !canEdit && matchComparison
          ? isCorrect && pick.predicted_winner === pick.player2 ? 'bg-green-500'
          : !isCorrect && pick.predicted_winner === pick.player2 ? 'bg-red-500'
          : 'bg-gray-700'
          : pick.predicted_winner === pick.player2 ? 'bg-blue-500'
          : 'bg-gray-700';

        if (pick.player2 === 'Bye' && !pick.predicted_winner && canEdit) {
          handlePick(pick, pick.player1); // Автоматическое продвижение
        }

        return (
          <div
            key={`${pick.round}-${pick.match_number}`}
            className={styles.matchContainer}
            style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
          >
            {!isWinnerRound && (
              <>
                <div className={`${styles.playerCell} ${player1Class}`}>
                  <span
                    className={`cursor-pointer ${!canEdit || !pick.player1 ? 'pointer-events-none' : ''}`}
                    onClick={() =>
                      canEdit &&
                      pick.player1 &&
                      handlePick(pick, pick.player1)
                    }
                  >
                    {displayPlayer1}
                  </span>
                </div>
                <div className={`${styles.playerCell} ${player2Class}`}>
                  <span
                    className={`cursor-pointer ${!canEdit || !pick.player2 || pick.player2 === 'Bye' ? 'pointer-events-none' : ''}`}
                    onClick={() =>
                      canEdit &&
                      pick.player2 &&
                      pick.player2 !== 'Bye' &&
                      handlePick(pick, pick.player2)
                    }
                  >
                    {displayPlayer2}
                  </span>
                </div>
              </>
            )}
            {isWinnerRound && (
              <div className={`${styles.playerCell} ${actualWinner ? 'bg-green-500' : 'bg-blue-500'}`}>
                <span>{winner || '-'}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}