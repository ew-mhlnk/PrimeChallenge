'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MatchList from './MatchList';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { UserPick } from '@/types'; // Импортируем UserPick вместо Pick

const allRounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W'];

export default function BracketPage() {
  const router = useRouter();
  const { id } = useParams();
  const {
    tournament,
    picks,
    error,
    isLoading,
    comparison,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick: originalHandlePick,
    savePicks,
  } = useTournamentLogic({ id: typeof id === 'string' ? id : undefined, allRounds });

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setNotification(error);
    }
  }, [error]);

  if (isLoading) {
    return <p>Загрузка...</p>;
  }

  if (!tournament) {
    return <p>Турнир не найден</p>;
  }

  // Проверяем, можно ли редактировать пики
  const canEdit = tournament.status === 'ACTIVE';

  // Модифицированная функция handlePick для обновления последующих раундов
  const handlePick = (match: UserPick, player: string | null) => { // Используем UserPick
    if (!canEdit) {
      setNotification('Турнир закрыт, пики нельзя изменить');
      return;
    }

    // Вызываем оригинальную функцию handlePick
    originalHandlePick(match, player);

    // Если выбор отменен (player = null), очищаем последующие пики
    if (player === null) {
      const newPicks = [...picks];
      const currentRoundIdx = allRounds.indexOf(match.round);

      // Обновляем последующие раунды
      for (let roundIdx = currentRoundIdx + 1; roundIdx < allRounds.length; roundIdx++) {
        const nextRound = allRounds[roundIdx];
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        const nextMatch = newPicks.find(
          (p) => p.round === nextRound && p.match_number === nextMatchNumber
        );

        if (nextMatch) {
          if (match.match_number % 2 === 1) {
            if (nextMatch.player1 === match.predicted_winner) {
              nextMatch.player1 = '';
              nextMatch.predicted_winner = '';
            }
          } else {
            if (nextMatch.player2 === match.predicted_winner) {
              nextMatch.player2 = '';
              nextMatch.predicted_winner = '';
            }
          }
        }

        // Если это финал, обновляем победителя
        if (nextRound === 'W') {
          const winnerMatch = newPicks.find((p) => p.round === 'W' && p.match_number === 1);
          if (winnerMatch) {
            winnerMatch.player1 = '';
            winnerMatch.predicted_winner = '';
          }
        }
      }
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      setNotification('Турнир закрыт, пики нельзя изменить');
      return;
    }
    await savePicks();
    setNotification('Пики сохранены!');
  };

  return (
    <div className="container mx-auto p-4">
      <button
        onClick={() => router.push('/')}
        className="mb-4 px-4 py-2 bg-gray-600 rounded text-white hover:bg-gray-500"
      >
        Назад
      </button>

      {notification && (
        <div className="mb-4 p-2 bg-yellow-500 text-white rounded">
          {notification}
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">{tournament.name}</h1>
      <p>{tournament.dates}</p>
      <p>Статус: {tournament.status}</p>

      <div className="flex space-x-2 mb-4 overflow-x-auto">
        {rounds.map((round: string) => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={`px-4 py-2 rounded ${
              selectedRound === round ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
            }`}
          >
            {round}
          </button>
        ))}
      </div>

      {selectedRound && (
        <MatchList
          picks={picks}
          round={selectedRound}
          comparison={comparison}
          handlePick={handlePick}
          canEdit={canEdit}
        />
      )}

      {canEdit && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleSave}
            className="Rectangle532 w-[176px] h-10 p-2.5 rounded-[20px] border border-[#D6D6D6] flex justify-center items-center gap-2.5"
          >
            <span className="text-[#D6D6D6] text-base font-bold leading-[19.2px]">
              Сохранить сетку
            </span>
          </button>
        </div>
      )}
    </div>
  );
}