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
  const roundPicks = picks.filter((pick) => pick.round === round);
  const comparisonMap = new Map(comparison.map(comp => [`${comp.round}-${comp.match_number}`, comp]));

  const findTrueWinnerForMatch = (pick: UserPick): string | null => {
    const roundIndex = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W'].indexOf(pick.round);
    if (roundIndex === 0) return null;

    const prevRound = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'][roundIndex - 1];
    const matchNumber1 = pick.match_number * 2 - 1;
    const matchNumber2 = pick.match_number * 2;

    const match1Comp = comparisonMap.get(`${prevRound}-${matchNumber1}`);
    const match2Comp = comparisonMap.get(`${prevRound}-${matchNumber2}`);

    if (match1Comp && match1Comp.actual_winner && pick.player1) {
      if (match1Comp.predicted_winner !== match1Comp.actual_winner && match1Comp.predicted_winner === pick.player1) {
        return match1Comp.actual_winner;
      }
    }
    if (match2Comp && match2Comp.actual_winner && pick.player2) {
      if (match2Comp.predicted_winner !== match2Comp.actual_winner && match2Comp.predicted_winner === pick.player2) {
        return match2Comp.actual_winner;
      }
    }
    return null;
  };

  return (
    <div className="space-y-[20px] flex flex-col items-center">
      {roundPicks.map((pick) => {
        const matchComparison = comparisonMap.get(`${pick.round}-${pick.match_number}`);
        const isCorrect = matchComparison?.correct;
        const actualWinner = matchComparison?.actual_winner || '';
        const isEliminated = matchComparison?.predicted_winner && matchComparison.actual_winner && matchComparison.predicted_winner !== matchComparison.actual_winner;

        const replacementPlayer1 = findTrueWinnerForMatch(pick);
        const replacementPlayer2 = findTrueWinnerForMatch(pick);

        const displayPlayer1 = replacementPlayer1 || pick.player1 || '';
        const displayPlayer2 = replacementPlayer2 || pick.player2 || '';
        const isPlayer1Eliminated = (isEliminated && pick.predicted_winner === pick.player1) || replacementPlayer1;
        const isPlayer2Eliminated = (isEliminated && pick.predicted_winner === pick.player2) || replacementPlayer2;

        const isWinnerRound = round === 'W';
        const winner = isWinnerRound
          ? (actualWinner || pick.predicted_winner || pick.player1 || '')
          : null;

        const player1Styles = {
          color: isWinnerRound ? '#FFFFFF' :
                actualWinner === '' && pick.predicted_winner === pick.player1 ? '#00B2FF' :
                isCorrect === true ? 'green' :
                isCorrect === false ? 'red' : '#FFFFFF',
          textDecoration: isPlayer1Eliminated ? 'line-through' : 'none',
        };
        const player2Styles = {
          color: isWinnerRound ? '#FFFFFF' :
                actualWinner === '' && pick.predicted_winner === pick.player2 ? '#00B2FF' :
                isCorrect === true ? 'green' :
                isCorrect === false ? 'red' : '#FFFFFF',
          textDecoration: isPlayer2Eliminated ? 'line-through' : 'none',
        };

        if (pick.player2 === 'Bye' && !pick.predicted_winner && canEdit) {
          setTimeout(() => handlePick(pick, pick.player1), 0);
        }

        return (
          <div
            key={`${pick.round}-${pick.match_number}`}
            className={`${styles.matchContainer} ${round === 'W' ? styles.noLines : ''}`}
          >
            <p className="text-[16px] font-semibold text-[#FFFFFF] mb-2">
              {isWinnerRound ? 'Победитель' : `Матч #${pick.match_number}`}
            </p>
            {isWinnerRound ? (
              <div className={styles.playerCell}>
                <span style={{ color: actualWinner ? '#FFFFFF' : '#00B2FF' }}>
                  {winner}
                </span>
              </div>
            ) : (
              <>
                <div className={styles.playerCell}>
                  <span
                    style={player1Styles}
                    className={`cursor-pointer ${!canEdit || !pick.player1 ? 'pointer-events-none' : ''}`}
                    onClick={() =>
                      canEdit &&
                      pick.player1 &&
                      handlePick(pick, pick.predicted_winner === pick.player1 ? null : pick.player1)
                    }
                  >
                    {displayPlayer1}
                  </span>
                </div>
                <div className={styles.playerCell}>
                  <span
                    style={player2Styles}
                    className={`cursor-pointer ${!canEdit || !pick.player2 || pick.player2 === 'Bye' ? 'pointer-events-none' : ''}`}
                    onClick={() =>
                      canEdit &&
                      pick.player2 &&
                      pick.player2 !== 'Bye' &&
                      handlePick(pick, pick.predicted_winner === pick.player2 ? null : pick.player2)
                    }
                  >
                    {displayPlayer2}
                  </span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}