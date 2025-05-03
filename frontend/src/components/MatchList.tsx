'use client';

import { UserPick, ComparisonResult } from '@/types';

interface MatchListProps {
  picks: UserPick[];
  round: string;
  comparison: ComparisonResult[];
  handlePick: (match: UserPick, player: string | null) => void;
  canEdit: boolean;
  styles: { [key: string]: string }; // Тип для CSS-модуля
}

export default function MatchList({ picks, round, comparison, handlePick, canEdit, styles }: MatchListProps) {
  // Фильтруем пики для текущего раунда
  const roundPicks = picks.filter((pick) => pick.round === round);

  // Создаём словарь сравнений для быстрого доступа
  const comparisonMap = new Map(comparison.map(comp => [`${comp.round}-${comp.match_number}`, comp]));

  // Функция для поиска реального победителя из предыдущих раундов
  const findTrueWinnerForMatch = (pick: UserPick): string | null => {
    const roundIndex = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W'].indexOf(pick.round);
    if (roundIndex === 0) return null; // Для R128 нет предыдущих раундов

    // Определяем, из какого матча предыдущего раунда пришли игроки
    const prevRound = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'][roundIndex - 1];
    const matchNumber1 = pick.match_number * 2 - 1;
    const matchNumber2 = pick.match_number * 2;

    // Ищем победителей из предыдущих матчей
    const match1Comp = comparisonMap.get(`${prevRound}-${matchNumber1}`);
    const match2Comp = comparisonMap.get(`${prevRound}-${matchNumber2}`);

    // Если текущий игрок выбывал в предыдущем раунде, возвращаем реального победителя
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
        // Находим сравнение для текущего матча
        const matchComparison = comparisonMap.get(`${pick.round}-${pick.match_number}`);
        const isCorrect = matchComparison?.correct;
        const actualWinner = matchComparison?.actual_winner || '';
        const isEliminated = matchComparison?.predicted_winner && matchComparison.actual_winner && matchComparison.predicted_winner !== matchComparison.actual_winner;

        // Ищем реального победителя из предыдущих раундов для отображения в следующих
        const replacementPlayer1 = findTrueWinnerForMatch(pick);
        const replacementPlayer2 = findTrueWinnerForMatch(pick);

        // Определяем, кого показывать в текущем раунде
        const displayPlayer1 = replacementPlayer1 || pick.player1 || 'TBD';
        const displayPlayer2 = replacementPlayer2 || pick.player2 || 'TBD';
        const isPlayer1Eliminated = (isEliminated && pick.predicted_winner === pick.player1) || replacementPlayer1;
        const isPlayer2Eliminated = (isEliminated && pick.predicted_winner === pick.player2) || replacementPlayer2;

        // Для раунда W показываем только победителя
        const isWinnerRound = round === 'W';
        const winner = isWinnerRound
          ? (actualWinner || pick.predicted_winner || pick.player1 || 'TBD')
          : null;

        // Определяем стили для игроков
        // Только predicted_winner будет синим, если матч не сыгран
        const player1Styles = {
          color: isWinnerRound ? '#FFFFFF' : // Для W цвет белый
                actualWinner === '' && pick.predicted_winner === pick.player1 ? '#00B2FF' : // Синий для несыгранных пиков
                isCorrect === true ? 'green' : // Зелёный для верных предсказаний
                isCorrect === false ? 'red' : '#FFFFFF', // Красный для неверных, иначе белый
          textDecoration: isPlayer1Eliminated ? 'line-through' : 'none',
        };
        const player2Styles = {
          color: isWinnerRound ? '#FFFFFF' : // Для W цвет белый
                actualWinner === '' && pick.predicted_winner === pick.player2 ? '#00B2FF' : // Синий для несыгранных пиков
                isCorrect === true ? 'green' : // Зелёный для верных предсказаний
                isCorrect === false ? 'red' : '#FFFFFF', // Красный для неверных, иначе белый
          textDecoration: isPlayer2Eliminated ? 'line-through' : 'none',
        };

        return (
          <div
            key={`${pick.round}-${pick.match_number}`}
            className={`${styles.matchContainer} ${round === 'W' ? styles.noLines : ''}`}
          >
            {/* Заголовок матча */}
            <p className="text-[16px] font-semibold text-[#FFFFFF] mb-2">
              {isWinnerRound ? 'Победитель' : `Матч #${pick.match_number}`}
            </p>
            {isWinnerRound ? (
              // Для раунда W показываем только победителя
              <div className={styles.playerCell}>
                <span style={{ color: actualWinner ? '#FFFFFF' : '#00B2FF' }}>
                  {winner}
                </span>
              </div>
            ) : (
              <>
                {/* Ячейка первого игрока */}
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
                    {replacementPlayer1 && ` (${replacementPlayer1})`}
                    {isEliminated && actualWinner && pick.player1 === pick.predicted_winner && ` (${actualWinner})`}
                  </span>
                </div>
                {/* Ячейка второго игрока */}
                <div className={styles.playerCell}>
                  <span
                    style={player2Styles}
                    className={`cursor-pointer ${!canEdit || !pick.player2 ? 'pointer-events-none' : ''}`}
                    onClick={() =>
                      canEdit &&
                      pick.player2 &&
                      handlePick(pick, pick.predicted_winner === pick.player2 ? null : pick.player2)
                    }
                  >
                    {displayPlayer2}
                    {replacementPlayer2 && ` (${replacementPlayer2})`}
                    {isEliminated && actualWinner && pick.player2 === pick.predicted_winner && ` (${actualWinner})`}
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