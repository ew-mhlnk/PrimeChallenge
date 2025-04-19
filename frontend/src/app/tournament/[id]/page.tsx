'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tournament } from '@/types';

// Указываем, что страница должна быть динамической
export const dynamic = 'force-dynamic';

interface Pick {
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  predicted_winner: string;
  winner?: string;
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

export default function TournamentPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const allRounds = useMemo(() => ["R128", "R64", "R32", "R16", "QF", "SF", "F"], []);
  const [rounds, setRounds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!id) {
      setError('ID турнира не указан');
      setIsLoading(false);
      return;
    }

    const initTelegram = async () => {
      const webApp = window.Telegram?.WebApp;
      if (webApp) {
        webApp.ready();
        const initData = webApp.initData;
        const initDataUnsafe = webApp.initDataUnsafe;
        const tgUser = initDataUnsafe?.user;

        if (tgUser && initData) {
          const response = await fetch('https://primechallenge.onrender.com/auth/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
          const data = await response.json();
          if (response.ok && data.status === 'ok') {
            setUserId(data.user_id);
          } else {
            setError('Ошибка авторизации. Попробуйте позже.');
          }
        } else {
          setError('Не удалось инициализировать Telegram WebApp.');
        }
      }
    };

    const fetchTournamentAndMatches = async () => {
      try {
        setIsLoading(true);

        // 1. Получаем турнир
        const tournamentsRes = await fetch(`https://primechallenge.onrender.com/tournaments`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!tournamentsRes.ok) {
          throw new Error(`Ошибка при загрузке турниров: ${tournamentsRes.status}`);
        }
        const tournamentsData: Tournament[] = await tournamentsRes.json();
        const found = tournamentsData.find((t) => t.id === parseInt(id as string));
        if (!found) {
          throw new Error(`Турнир с ID ${id} не найден`);
        }

        setTournament(found);

        // 2. Формируем массив раундов, начиная с starting_round, и добавляем W
        const startIndex = allRounds.indexOf(found.starting_round);
        if (startIndex !== -1) {
          const applicableRounds = [...allRounds.slice(startIndex), "W"];
          setRounds(applicableRounds);
          setSelectedRound(found.starting_round);
        } else {
          setRounds([]);
          setSelectedRound(null);
        }

        // 3. Загружаем матчи первого раунда и сразу инициализируем пики
        const matchesRes = await fetch(`https://primechallenge.onrender.com/matches?tournament_id=${found.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!matchesRes.ok) {
          throw new Error(`Ошибка при загрузке матчей: ${matchesRes.status}`);
        }
        const matchesData: { round: string; match_number: number; player1: string; player2: string; winner?: string }[] = await matchesRes.json();
        const initialPicks = matchesData.map((match) => ({
          round: match.round,
          match_number: match.match_number,
          player1: match.player1,
          player2: match.player2,
          predicted_winner: "",
          winner: match.winner || "",
        }));
        setPicks(initialPicks);

        // Если турнир закрыт, загружаем сравнение
        if (found.status === "CLOSED" && userId) {
          const comparisonRes = await fetch(
            `https://primechallenge.onrender.com/picks/compare?tournament_id=${found.id}&user_id=${userId}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );
          if (comparisonRes.ok) {
            const comparisonData = await comparisonRes.json();
            setComparison(comparisonData);
          }
        }
      } catch {
        setError('Ошибка при загрузке данных. Попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };

    initTelegram();
    fetchTournamentAndMatches();
  }, [id, userId, allRounds]);

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

      const nextPlayer = player === "Q" || player === "LL" ? player : player;

      if (!existingNextMatch) {
        newPicks.push({
          round: nextRound,
          match_number: nextMatchNumber,
          player1: match.match_number % 2 === 1 ? nextPlayer : "",
          player2: match.match_number % 2 === 0 ? nextPlayer : "",
          predicted_winner: "",
          winner: "",
        });
      } else {
        if (match.match_number % 2 === 1) {
          existingNextMatch.player1 = nextPlayer;
          existingNextMatch.predicted_winner = "";
        } else {
          existingNextMatch.player2 = nextPlayer;
          existingNextMatch.predicted_winner = "";
        }
      }
    } else if (match.round === "F") {
      // Если это финал (F), добавляем победителя в раунд W
      const winnerMatch = newPicks.find((p) => p.round === "W" && p.match_number === 1);
      if (!winnerMatch) {
        newPicks.push({
          round: "W",
          match_number: 1,
          player1: player,
          player2: "", // Второй игрок не нужен, так как это победитель
          predicted_winner: player, // Автоматически устанавливаем победителя
          winner: "",
        });
      } else {
        winnerMatch.player1 = player;
        winnerMatch.predicted_winner = player;
      }
    }
    setPicks(newPicks);
  };

  const savePicks = async () => {
    if (!userId || !tournament) {
      alert('Ошибка: пользователь или турнир не определены.');
      return;
    }

    try {
      const picksToSave = picks
        .filter((p) => p.predicted_winner)
        .map((p) => ({
          round: p.round,
          match_number: p.match_number,
          predicted_winner: p.predicted_winner,
        }));

      console.log('Отправляемые данные:', {
        tournament_id: tournament.id,
        user_id: userId,
        picks: picksToSave,
      });

      const response = await fetch('https://primechallenge.onrender.com/picks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: tournament.id,
          user_id: userId,
          picks: picksToSave,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка при сохранении пиков: ${response.status} - ${errorText}`);
      }

      alert('Пики успешно сохранены!');
    } catch (err) {
      const error = err as Error;
      console.error('Ошибка при сохранении:', error);
      alert(`Ошибка при сохранении пиков: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-red-400">{error}</p>
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

  const championMatch = comparison.find((c) => c.round === "F" && c.match_number === 1);
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
        {champion && selectedRound !== "W" && (
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

                const displayPlayer1 = pick.player1 === "Q" || pick.player1 === "LL" ? pick.player1 : pick.player1 || 'TBD';
                const displayPlayer2 = pick.player2 === "Q" || pick.player2 === "LL" ? pick.player2 : pick.player2 || 'TBD';

                return (
                  <div key={`${pick.round}-${pick.match_number}`} className="bg-gray-800 p-4 rounded-lg shadow-md mb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        {/* Для раунда W отображаем только одного игрока (победителя) */}
                        {selectedRound === "W" ? (
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
                                tournament.status === 'ACTIVE' && pick.player1 && handlePick(pick, pick.player1)
                              }
                            >
                              {displayPlayer1}
                            </p>
                            <p
                              className={`text-lg font-medium cursor-pointer ${
                                pick.predicted_winner === pick.player2 ? 'text-green-400' : ''
                              } ${tournament.status === 'ACTIVE' ? 'hover:underline' : ''}`}
                              onClick={() =>
                                tournament.status === 'ACTIVE' && pick.player2 && handlePick(pick, pick.player2)
                              }
                            >
                              {displayPlayer2}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex space-x-4">
                        {comparisonResult && selectedRound !== "W" && (
                          <div>
                            <p className="text-gray-400">Прогноз: {comparisonResult.predicted_winner}</p>
                            <p className="text-gray-400">Факт: {comparisonResult.actual_winner}</p>
                            <p className={comparisonResult.correct ? 'text-green-400' : 'text-red-400'}>
                              {comparisonResult.correct ? 'Правильно' : 'Неправильно'}
                            </p>
                          </div>
                        )}
                        {pick.winner && selectedRound !== "W" && (
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