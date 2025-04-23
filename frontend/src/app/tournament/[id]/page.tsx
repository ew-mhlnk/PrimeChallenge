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
  const [initData, setInitData] = useState<string | null>(null);

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
          setInitData(initData);
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

        const startIndex = allRounds.indexOf(found.starting_round);
        if (startIndex !== -1) {
          const applicableRounds = [...allRounds.slice(startIndex), "W"];
          setRounds(applicableRounds);
          setSelectedRound(found.starting_round);

          // Инициализируем пики для всех раундов
          const initialPicks: Pick[] = [];
          for (let roundIndex = startIndex; roundIndex < allRounds.length; roundIndex++) {
            const round = allRounds[roundIndex];
            const numMatches = Math.pow(2, allRounds.length - 1 - roundIndex);
            for (let i = 1; i <= numMatches; i++) {
              initialPicks.push({
                round,
                match_number: i,
                player1: "",
                player2: "",
                predicted_winner: "",
                winner: "",
              });
            }
          }

          const matchesRes = await fetch(`https://primechallenge.onrender.com/tournaments/matches/by-id?tournament_id=${found.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!matchesRes.ok) {
            throw new Error(`Ошибка при загрузке матчей: ${matchesRes.status}`);
          }
          const matchesData: { round: string; match_number: number; player1: string; player2: string; winner?: string }[] = await matchesRes.json();
          matchesData.forEach((match) => {
            const matchIndex = initialPicks.findIndex(
              (p) => p.round === match.round && p.match_number === match.match_number
            );
            if (matchIndex !== -1) {
              initialPicks[matchIndex] = {
                round: match.round,
                match_number: match.match_number,
                player1: match.player1,
                player2: match.player2,
                predicted_winner: "",
                winner: match.winner || "",
              };
            }
          });

          // Добавляем финального победителя (W)
          initialPicks.push({
            round: "W",
            match_number: 1,
            player1: "",
            player2: "",
            predicted_winner: "",
            winner: "",
          });

          setPicks(initialPicks);
        } else {
          setRounds([]);
          setSelectedRound(null);
        }

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
      } catch (err) {
        const error = err as Error;
        setError(`Ошибка при загрузке данных: ${error.message}`);
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

    const currentRoundIdx = allRounds.indexOf(match.round);
    if (currentRoundIdx < allRounds.length - 1) {
      const nextRound = allRounds[currentRoundIdx + 1];
      const nextMatchNumber = Math.ceil(match.match_number / 2);
      const existingNextMatch = newPicks.find(
        (p) => p.round === nextRound && p.match_number === nextMatchNumber
      );

      const nextPlayer = player === "Q" || player === "LL" ? player : player;

      if (existingNextMatch) {
        if (match.match_number % 2 === 1) {
          existingNextMatch.player1 = nextPlayer;
        } else {
          existingNextMatch.player2 = nextPlayer;
        }
        existingNextMatch.predicted_winner = "";
      }
    } else if (match.round === "F") {
      const winnerMatch = newPicks.find((p) => p.round === "W" && p.match_number === 1);
      if (winnerMatch) {
        winnerMatch.player1 = player;
        winnerMatch.predicted_winner = player;
      }
    }
    setPicks(newPicks);
  };

  const savePicks = async () => {
    if (!userId || !tournament) {
      console.log('>>> [savePicks] userId or tournament is undefined', { userId, tournament });
      alert('Ошибка: пользователь или турнир не определены.');
      return;
    }

    if (!initData) {
      console.log('>>> [savePicks] initData is missing');
      alert('Ошибка: данные Telegram не инициализированы.');
      return;
    }

    try {
      const picksToSave = picks
        .filter((p) => p.predicted_winner)
        .map((p) => ({
          tournament_id: tournament.id,
          round: p.round,
          match_number: p.match_number,
          player1: p.player1 || "",
          player2: p.player2 || "",
          predicted_winner: p.predicted_winner,
        }));

      console.log('>>> [savePicks] Sending data:', picksToSave);

      const response = await fetch('https://primechallenge.onrender.com/picks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
        },
        body: JSON.stringify(picksToSave),
      });

      console.log('>>> [savePicks] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.log('>>> [savePicks] Error response:', errorText);
        throw new Error(`Ошибка при сохранении пиков: ${response.status} - ${errorText}`);
      }

      alert('Пики успешно сохранены!');
    } catch (err) {
      const error = err as Error;
      console.error('>>> [savePicks] Error:', error);
      alert(`Ошибка при сохранении пиков: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <p className="text-xl">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <p className="text-xl text-red-400">{error}</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <p className="text-xl">Турнир не найден</p>
      </div>
    );
  }

  const championMatch = comparison.find((c) => c.round === "F" && c.match_number === 1);
  const champion = championMatch?.actual_winner;

  return (
    <div className="min-h-screen bg-[#141414] text-white p-6">
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
                ? 'bg-gradient-to-r from-[#008CFF] to-[#0077FF] opacity-25 border border-[#00B2FF] text-[#CBCBCB]'
                : 'bg-gray-700 text-[#5F6067] hover:bg-gray-600'
            }`}
          >
            {round}
          </button>
        ))}
      </div>

      {selectedRound && (
        <section className="grid gap-4">
          {picks
            .filter((pick) => pick.round === selectedRound)
            .reduce((acc: Pick[][], curr, index) => {
              if (index % 2 === 0) {
                acc.push([curr]);
              } else {
                acc[acc.length - 1].push(curr);
              }
              return acc;
            }, [])
            .map((pair, pairIndex) => (
              <div key={pairIndex} className="flex items-center mb-5">
                <div className="pair flex flex-col items-start">
                  {pair.map((pick, index) => {
                    const displayPlayer1 = pick.player1 === "Q" || pick.player1 === "LL" ? pick.player1 : pick.player1 || 'TBD';
                    const displayPlayer2 = pick.player2 === "Q" || pick.player2 === "LL" ? pick.player2 : pick.player2 || 'TBD';

                    return (
                      <div key={`${pick.round}-${pick.match_number}`} className="match flex items-center">
                        <div className="flex flex-col">
                          <div className="bg-gradient-to-r from-[#1B1A1F] to-[#161616] border border-gradient-to-r from-[rgba(255,255,255,0.25)] to-[#999999] rounded-[10px] p-2 mb-2.5">
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
                          </div>
                          {selectedRound !== "W" && index === 0 && (
                            <div className="bg-gradient-to-r from-[#1B1A1F] to-[#161616] border border-gradient-to-r from-[rgba(255,255,255,0.25)] to-[#999999] rounded-[10px] p-2">
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
                            </div>
                          )}
                        </div>
                        {selectedRound !== "W" && index === 0 && (
                          <svg width="20" height="40" viewBox="0 0 20 40" className="ml-2">
                            <path d="M0 0 L20 0 L20 40 L0 40" stroke="#434343" fill="none" strokeWidth="2" />
                          </svg>
                        )}
                        {selectedRound === "W" && (
                          <p className="text-lg font-medium text-green-400 ml-2">
                            Победитель: {displayPlayer1}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {pair.length === 2 && selectedRound !== "W" && (
                  <svg width="40" height="80" viewBox="0 0 40 80" className="ml-2">
                    <path d="M0 0 L40 0 L40 80 L0 80" stroke="#434343" fill="none" strokeWidth="2" />
                    <rect x="10" y="30" width="20" height="20" rx="15" fill="#D9D9D9" />
                  </svg>
                )}
                <div className="flex space-x-4 ml-4">
                  {pair.map((pick) =>
                    selectedRound !== "W" ? (
                      (() => {
                        const comparisonResult = comparison.find(
                          (c) => c.round === pick.round && c.match_number === pick.match_number
                        );
                        return comparisonResult ? (
                          <div key={`${pick.round}-${pick.match_number}`}>
                            <p className="text-gray-400">Прогноз: {comparisonResult.predicted_winner}</p>
                            <p className="text-gray-400">Факт: {comparisonResult.actual_winner}</p>
                            <p className={comparisonResult.correct ? 'text-green-400' : 'text-red-400'}>
                              {comparisonResult.correct ? 'Правильно' : 'Неправильно'}
                            </p>
                          </div>
                        ) : null;
                      })()
                    ) : null
                  )}
                  {pair.map((pick) => (
                    pick.winner && selectedRound !== "W" && (
                      <div key={`${pick.round}-${pick.match_number}`}>
                        <p className="text-gray-400">W: {pick.winner}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
        </section>
      )}

      {tournament.status === 'ACTIVE' && (
        <button
          onClick={savePicks}
          className="mt-6 px-4 py-2 bg-gradient-to-r from-[#008CFF] to-[#0077FF] opacity-25 border border-[#00B2FF] text-[#CBCBCB] rounded-full"
        >
          Сохранить сетку
        </button>
      )}
    </div>
  );
}