'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tournament, Match } from '@/types';
import useAuth from '@/hooks/useAuth';
import useTournaments from '@/hooks/useTournaments';

// Указываем, что страница должна быть динамической
export const dynamic = 'force-dynamic';

// Типы для данных
interface Pick {
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string;
  winner?: string;
  set1?: string | null; // Добавляем счёт
  set2?: string | null;
  set3?: string | null;
  set4?: string | null;
  set5?: string | null;
}

interface ComparisonResult {
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string;
  actual_winner: string;
  correct: boolean;
}

// Тип для matchesPerRound
interface MatchesPerRound {
  [key: string]: number;
  R128: number;
  R64: number;
  R32: number;
  R16: number;
  QF: number;
  SF: number;
  F: number;
  W: number;
}

export default function TournamentPage() {
  const { id } = useParams();
  const tournamentId = Array.isArray(id) ? id[0] : id; // Приводим к строке

  // Используем хуки
  const { user, isLoading: authLoading, error: authError } = useAuth();
  const { tournaments, error: tournamentsError } = useTournaments();
  const [tournament, setTournament] = useState<Tournament | null>(null);

  const [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const allRounds = useMemo(() => ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W'], []);
  const [rounds, setRounds] = useState<string[]>([]);

  // Количество матчей для каждого раунда
  const matchesPerRound = useMemo<MatchesPerRound>(
    () => ({
      R128: 64, // 128 игроков -> 64 матча
      R64: 32, // 64 игрока -> 32 матча
      R32: 16, // 32 игрока -> 16 матчей
      R16: 8, // 16 игроков -> 8 матчей
      QF: 4, // 8 игроков -> 4 матча
      SF: 2, // 4 игрока -> 2 матча
      F: 1, // 2 игрока -> 1 матч
      W: 1, // 1 чемпион
    }),
    []
  );

  useEffect(() => {
    if (!tournamentId) {
      setError('ID турнира не указан');
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      try {
        setIsLoading(true);

        // 1. Ждём завершения авторизации
        if (authLoading) return;
        if (authError) {
          setError(authError);
          setIsLoading(false);
          return;
        }
        if (!user || user.id === 0) {
          setError('Не удалось авторизовать пользователя');
          setIsLoading(false);
          return;
        }

        // 2. Находим турнир
        const found = tournaments.find((t) => t.id === parseInt(tournamentId));
        if (!found) {
          setError(`Турнир с ID ${tournamentId} не найден`);
          setIsLoading(false);
          return;
        }
        setTournament(found);

        // 3. Формируем массив раундов, начиная с starting_round, и добавляем W
        const startIndex = allRounds.indexOf(found.starting_round);
        if (startIndex === -1) {
          setError(`Недопустимый начальный раунд: ${found.starting_round}`);
          setIsLoading(false);
          return;
        }
        const applicableRounds = allRounds.slice(startIndex);
        setRounds(applicableRounds);
        setSelectedRound(found.starting_round);

        // 4. Загружаем начальные пики
        const matchesRes = await fetch(
          `https://primechallenge.onrender.com/picks/initial-matches?tournament_id=${found.id}&user_id=${user.id}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        if (!matchesRes.ok) {
          throw new Error(`Ошибка при загрузке начальных матчей: ${matchesRes.status}`);
        }
        const matchesData = (await matchesRes.json()) as Match[];

        // 5. Инициализируем пики для всех раундов
        const initialPicks: Pick[] = [];

        // Начальный раунд: используем данные из true_draw (уже сохранённые в user_picks)
        matchesData.forEach((match) => {
          initialPicks.push({
            round: match.round,
            match_number: match.match_number,
            player1: match.player1 || 'TBD',
            player2: match.player2 || 'TBD',
            predicted_winner: '',
            winner: match.winner || '',
            set1: match.set1, // Добавляем счёт
            set2: match.set2,
            set3: match.set3,
            set4: match.set4,
            set5: match.set5,
          });
        });

        // Добавляем пустые ячейки для остальных раундов
        for (let i = startIndex + 1; i < allRounds.length; i++) {
          const round = allRounds[i];
          const numMatches = matchesPerRound[round];
          for (let matchNumber = 1; matchNumber <= numMatches; matchNumber++) {
            initialPicks.push({
              round,
              match_number: matchNumber,
              player1: '',
              player2: '',
              predicted_winner: '',
              winner: '',
              set1: null, // Пустой счёт для будущих раундов
              set2: null,
              set3: null,
              set4: null,
              set5: null,
            });
          }
        }

        setPicks(initialPicks);

        // 6. Если турнир закрыт, загружаем сравнение
        if (found.status === 'CLOSED') {
          const comparisonRes = await fetch(
            `https://primechallenge.onrender.com/picks/compare?tournament_id=${found.id}&user_id=${user.id}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );
          if (comparisonRes.ok) {
            const comparisonData = (await comparisonRes.json()) as ComparisonResult[];
            setComparison(comparisonData);
          }
        }
      } catch {
        setError('Ошибка при загрузке данных. Попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [tournamentId, user, authLoading, authError, tournaments, allRounds, matchesPerRound]);

  const handlePick = (match: Pick, player: string) => {
    const newPicks = [...picks];
    const matchIndex = newPicks.findIndex(
      (p) => p.round === match.round && p.match_number === match.match_number
    );
    newPicks[matchIndex].predicted_winner = player;
    setPicks(newPicks);

    const currentRoundIdx = allRounds.indexOf(match.round);
    if (currentRoundIdx < allRounds.length - 1) {
      const nextRound = allRounds[currentRoundIdx + 1];
      const nextMatchNumber = Math.ceil(match.match_number / 2);
      const existingNextMatch = newPicks.find(
        (p) => p.round === nextRound && p.match_number === nextMatchNumber
      );

      const nextPlayer = player === 'Q' || player === 'LL' ? player : player;

      if (!existingNextMatch) {
        newPicks.push({
          round: nextRound,
          match_number: nextMatchNumber,
          player1: match.match_number % 2 === 1 ? nextPlayer : '',
          player2: match.match_number % 2 === 0 ? nextPlayer : '',
          predicted_winner: '',
          winner: '',
          set1: null, // Пустой счёт для нового матча
          set2: null,
          set3: null,
          set4: null,
          set5: null,
        });
      } else {
        if (match.match_number % 2 === 1) {
          existingNextMatch.player1 = nextPlayer;
          existingNextMatch.predicted_winner = '';
        } else {
          existingNextMatch.player2 = nextPlayer;
          existingNextMatch.predicted_winner = '';
        }
      }
    } else if (match.round === 'F') {
      const winnerMatch = newPicks.find((p) => p.round === 'W' && p.match_number === 1);
      if (!winnerMatch) {
        newPicks.push({
          round: 'W',
          match_number: 1,
          player1: player,
          player2: '',
          predicted_winner: player,
          winner: '',
          set1: null, // Пустой счёт для финального матча
          set2: null,
          set3: null,
          set4: null,
          set5: null,
        });
      } else {
        winnerMatch.player1 = player;
        winnerMatch.predicted_winner = player;
      }
    }
    setPicks(newPicks);
  };

  const savePicks = async () => {
    if (!user || !tournament) {
      alert('Ошибка: пользователь или турнир не определены.');
      return;
    }

    try {
      const picksToSave = picks
        .filter((p) => p.player1 || p.player2) // Сохраняем все матчи, где есть игроки
        .map((p) => ({
          round: p.round,
          match_number: p.match_number,
          player1: p.player1,
          player2: p.player2,
          predicted_winner: p.predicted_winner || '', // Сохраняем даже пустые предсказания
        }));

      const payload = {
        tournament_id: tournament.id,
        user_id: user.id,
        picks: picksToSave,
      };
      console.log('Отправляемые данные:', JSON.stringify(payload, null, 2));

      const response = await fetch('https://primechallenge.onrender.com/picks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка при сохранении пиков: ${response.status} - ${errorText}`);
      }

      alert('Пики успешно сохранены!');
    } catch (err) {
      if (err instanceof Error) {
        console.error('Ошибка при сохранении:', err);
        alert(`Ошибка при сохранении пиков: ${err.message}`);
      } else {
        console.error('Неизвестная ошибка:', err);
        alert('Неизвестная ошибка при сохранении пиков.');
      }
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Загрузка...</p>
      </div>
    );
  }

  if (error || authError || tournamentsError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-red-400">{error || authError || tournamentsError}</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Турнир не найден</p>
      </div>
    );
  }

  const championMatch = comparison.find((c) => c.round === 'F' && c.match_number === 1);
  const champion = championMatch?.actual_winner;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <Link href="/" className="text-cyan-400 hover:underline">
          ← Назад
        </Link>
        <h1 className="text-4xl font-bold mt-4">{tournament.name}</h1>
        <p className="text-gray-400 mt-2">{tournament.dates}</p>
        <span
          className={`mt-2 inline-block px-2 py-1 rounded text-sm ${
            tournament.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
          }`}
        >
          {tournament.status === 'ACTIVE' ? 'Активен' : 'Завершён'}
        </span>
        {champion && selectedRound !== 'W' && (
          <p className="text-green-400 mt-2">Победитель: {champion}</p>
        )}
      </header>

      <div className="flex space-x-2 mb-6">
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedRound === round
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {round}
          </button>
        ))}
      </div>

      {selectedRound && (
        <section className="grid gap-4">
          <div>
            {picks
              .filter((pick) => pick.round === selectedRound)
              .map((pick) => {
                const comparisonResult = comparison.find(
                  (c) => c.round === pick.round && c.match_number === pick.match_number
                );

                const displayPlayer1 =
                  pick.player1 === 'Q' || pick.player1 === 'LL' ? pick.player1 : pick.player1 || 'TBD';
                const displayPlayer2 =
                  pick.player2 === 'Q' || pick.player2 === 'LL' ? pick.player2 : pick.player2 || 'TBD';

                // Формируем строку счёта, если сеты доступны
                const sets = [pick.set1, pick.set2, pick.set3, pick.set4, pick.set5]
                  .filter((set) => set) // Фильтруем пустые значения
                  .join(' ');

                return (
                  <div
                    key={`${pick.round}-${pick.match_number}`}
                    className="bg-gray-800 p-4 rounded-lg shadow-md mb-2"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        {selectedRound === 'W' ? (
                          <p className="text-lg font-medium text-green-400">
                            Победитель: {displayPlayer1}
                          </p>
                        ) : (
                          <>
                            <p
                              className={`text-lg font-medium cursor-pointer ${
                                pick.predicted_winner === pick.player1 ? 'text-green-400' : ''
                              } ${tournament.status === 'ACTIVE' ? 'hover:underline' : ''}`}
                              onClick={() =>
                                tournament.status === 'ACTIVE' &&
                                pick.player1 &&
                                handlePick(pick, pick.player1)
                              }
                            >
                              {displayPlayer1}
                            </p>
                            <p
                              className={`text-lg font-medium cursor-pointer ${
                                pick.predicted_winner === pick.player2 ? 'text-green-400' : ''
                              } ${tournament.status === 'ACTIVE' ? 'hover:underline' : ''}`}
                              onClick={() =>
                                tournament.status === 'ACTIVE' &&
                                pick.player2 &&
                                handlePick(pick, pick.player2)
                              }
                            >
                              {displayPlayer2}
                            </p>
                            {sets && (
                              <p className="text-sm text-gray-400 mt-1">
                                Счёт: {sets}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex space-x-4">
                        {comparisonResult && selectedRound !== 'W' && (
                          <div>
                            <p className="text-gray-400">Прогноз: {comparisonResult.predicted_winner}</p>
                            <p className="text-gray-400">Факт: {comparisonResult.actual_winner}</p>
                            <p className={comparisonResult.correct ? 'text-green-400' : 'text-red-400'}>
                              {comparisonResult.correct ? 'Правильно' : 'Неправильно'}
                            </p>
                          </div>
                        )}
                        {pick.winner && selectedRound !== 'W' && (
                          <div>
                            <p className="text-gray-400">W: {pick.winner}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {tournament.status === 'ACTIVE' && (
        <button
          onClick={savePicks}
          className="mt-6 px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600"
        >
          Сохранить сетку
        </button>
      )}
    </div>
  );
}