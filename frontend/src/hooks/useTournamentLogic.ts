import { useState, useEffect } from 'react';
import { Tournament, UserPick, ComparisonResult } from '@/types'; // Используем UserPick

interface UseTournamentLogicProps {
  id?: string;
  allRounds: string[];
}

export const useTournamentLogic = ({ id, allRounds }: UseTournamentLogicProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [picks, setPicks] = useState<UserPick[]>([]); // Используем UserPick
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);

  // Загрузка данных турнира
  useEffect(() => {
    const fetchTournament = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const response = await fetch(`https://primechallenge.onrender.com/tournaments/?status=ACTIVE`);
        if (!response.ok) {
          throw new Error('Ошибка при загрузке турнира');
        }
        const tournaments: Tournament[] = await response.json();
        const selectedTournament = tournaments.find((t) => t.id === parseInt(id));
        if (!selectedTournament) {
          throw new Error('Турнир не найден');
        }
        setTournament(selectedTournament);

        // Устанавливаем начальный раунд
        const startIdx = allRounds.indexOf(selectedTournament.starting_round);
        const availableRounds = allRounds.slice(startIdx);
        setRounds(availableRounds);
        setSelectedRound(selectedTournament.starting_round);
      } catch (err: unknown) { // Заменяем any на unknown
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournament();
  }, [id, allRounds]);

  // Загрузка пиков пользователя
  useEffect(() => {
    const fetchPicks = async () => {
      if (!id) return;

      try {
        const response = await fetch(
          `https://primechallenge.onrender.com/picks/?tournament_id=${id}`,
          {
            headers: {
              'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
            },
          }
        );
        if (!response.ok) {
          throw new Error('Ошибка при загрузке пиков');
        }
        const data: UserPick[] = await response.json(); // Используем UserPick
        setPicks(data);
      } catch (err: unknown) { // Заменяем any на unknown
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      }
    };

    fetchPicks();
  }, [id]);

  // Сравнение пиков с реальными результатами
  useEffect(() => {
    const fetchComparison = async () => {
      if (!id || !tournament) return;

      try {
        const response = await fetch(
          `https://primechallenge.onrender.com/picks/compare?tournament_id=${id}&user_id=${window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 1}`,
          {
            headers: {
              'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
            },
          }
        );
        if (!response.ok) {
          throw new Error('Ошибка при сравнении пиков');
        }
        const data: ComparisonResult[] = await response.json();
        setComparison(data);
      } catch (err: unknown) { // Заменяем any на unknown
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      }
    };

    fetchComparison();
  }, [id, tournament]);

  // Функция для обработки пиков
  const handlePick = (match: UserPick, player: string | null) => { // Используем UserPick
    const updatedPicks = [...picks];
    const matchIndex = updatedPicks.findIndex(
      (p) => p.round === match.round && p.match_number === match.match_number
    );

    if (matchIndex !== -1) {
      updatedPicks[matchIndex] = { ...updatedPicks[matchIndex], predicted_winner: player };
      setPicks(updatedPicks);

      // Обновляем последующие раунды
      const currentRoundIdx = allRounds.indexOf(match.round);
      for (let roundIdx = currentRoundIdx + 1; roundIdx < allRounds.length; roundIdx++) {
        const nextRound = allRounds[roundIdx];
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        const nextMatch = updatedPicks.find(
          (p) => p.round === nextRound && p.match_number === nextMatchNumber
        );

        if (nextMatch) {
          if (match.match_number % 2 === 1) {
            nextMatch.player1 = player || '';
          } else {
            nextMatch.player2 = player || '';
          }
          if (!nextMatch.player1 || !nextMatch.player2) {
            nextMatch.predicted_winner = null;
          }
        }

        // Если это финал, обновляем победителя
        if (nextRound === 'W') {
          const winnerMatch = updatedPicks.find((p) => p.round === 'W' && p.match_number === 1);
          if (winnerMatch) {
            winnerMatch.player1 = player || '';
            winnerMatch.predicted_winner = player;
          }
        }
      }
    }
  };

  // Функция для сохранения пиков
  const savePicks = async () => {
    try {
      const response = await fetch('https://primechallenge.onrender.com/picks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
        },
        body: JSON.stringify(picks),
      });
      if (!response.ok) {
        throw new Error('Ошибка при сохранении пиков');
      }
    } catch (err: unknown) { // Заменяем any на unknown
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(message);
    }
  };

  return {
    tournament,
    picks,
    error,
    isLoading,
    comparison,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
  };
};