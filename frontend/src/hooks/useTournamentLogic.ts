import { useEffect, useState } from 'react';
import { Tournament, Pick, ComparisonResult } from '@/types'; // Правильный импорт

interface UseTournamentLogicProps {
  id: string | undefined;
  allRounds: string[];
}

export const useTournamentLogic = ({ id, allRounds }: UseTournamentLogicProps) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [rounds, setRounds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
        if (!tournamentsRes.ok) throw new Error(`Ошибка при загрузке турниров: ${tournamentsRes.status}`);
        const tournamentsData: Tournament[] = await tournamentsRes.json();
        const found = tournamentsData.find((t) => t.id === parseInt(id));
        if (!found) throw new Error(`Турнир с ID ${id} не найден`);

        setTournament(found);

        const startIndex = allRounds.indexOf(found.starting_round);
        if (startIndex !== -1) {
          const applicableRounds = [...allRounds.slice(startIndex), "W"];
          setRounds(applicableRounds);
          setSelectedRound(found.starting_round);

          const initialPicks: Pick[] = [];
          for (let roundIndex = startIndex; roundIndex < allRounds.length; roundIndex++) {
            const round = allRounds[roundIndex];
            const numMatches = Math.pow(2, allRounds.length - 1 - roundIndex);
            for (let i = 1; i <= numMatches; i++) {
              initialPicks.push({
                tournament_id: found.id,
                round,
                match_number: i,
                player1: "",
                player2: "",
                predicted_winner: "",
                winner: "",
              });
            }
          }
          initialPicks.push({
            tournament_id: found.id,
            round: "W",
            match_number: 1,
            player1: "",
            player2: "",
            predicted_winner: "",
            winner: "",
          });

          const matchesRes = await fetch(`https://primechallenge.onrender.com/tournaments/matches/by-id?tournament_id=${found.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!matchesRes.ok) throw new Error(`Ошибка при загрузке матчей: ${matchesRes.status}`);
          const matchesData = await matchesRes.json();

          matchesData.forEach((match: { round: string; match_number: number; player1: string; player2: string; winner?: string }) => {
            const matchIndex = initialPicks.findIndex((p) => p.round === match.round && p.match_number === match.match_number);
            if (matchIndex !== -1) {
              initialPicks[matchIndex] = {
                ...initialPicks[matchIndex],
                player1: match.player1,
                player2: match.player2,
                predicted_winner: "",
                winner: match.winner || "",
              };
            }
          });

          if (userId && initData) {
            const picksRes = await fetch(`https://primechallenge.onrender.com/picks/?tournament_id=${found.id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': initData,
              },
            });
            if (picksRes.ok) {
              const userPicks: Pick[] = await picksRes.json();
              userPicks.forEach((userPick) => {
                const matchIndex = initialPicks.findIndex((p) => p.round === userPick.round && p.match_number === userPick.match_number);
                if (matchIndex !== -1) {
                  initialPicks[matchIndex] = {
                    ...initialPicks[matchIndex],
                    player1: userPick.player1 || initialPicks[matchIndex].player1,
                    player2: userPick.player2 || initialPicks[matchIndex].player2,
                    predicted_winner: userPick.predicted_winner || "",
                  };
                } else {
                  initialPicks.push({
                    tournament_id: found.id,
                    round: userPick.round,
                    match_number: userPick.match_number,
                    player1: userPick.player1 || "",
                    player2: userPick.player2 || "",
                    predicted_winner: userPick.predicted_winner || "",
                    winner: "",
                  });
                }
              });
            }
          }

          setPicks(initialPicks);
        } else {
          setRounds([]);
          setSelectedRound(null);
        }

        if (found.status === "CLOSED" && userId) {
          const comparisonRes = await fetch(`https://primechallenge.onrender.com/picks/compare?tournament_id=${found.id}&user_id=${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (comparisonRes.ok) setComparison(await comparisonRes.json());
        }
      } catch (err) {
        setError(`Ошибка при загрузке данных: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    initTelegram();
    fetchTournamentAndMatches();
  }, [id, userId, allRounds, initData]);

  const handlePick = (match: Pick, player: string) => {
    const newPicks = [...picks];
    const matchIndex = newPicks.findIndex((p) => p.round === match.round && p.match_number === match.match_number);
    newPicks[matchIndex].predicted_winner = player;

    const currentRoundIdx = allRounds.indexOf(match.round);
    if (currentRoundIdx < allRounds.length - 1) {
      const nextRound = allRounds[currentRoundIdx + 1];
      const nextMatchNumber = Math.ceil(match.match_number / 2);
      const existingNextMatch = newPicks.find((p) => p.round === nextRound && p.match_number === nextMatchNumber);

      const nextPlayer = player === "Q" || player === "LL" ? player : player;

      if (existingNextMatch) {
        if (match.match_number % 2 === 1) {
          existingNextMatch.player1 = nextPlayer;
        } else {
          existingNextMatch.player2 = nextPlayer;
        }
        existingNextMatch.predicted_winner = existingNextMatch.player1 && existingNextMatch.player2 ? existingNextMatch.player1 : "";
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
    if (!userId || !tournament || !initData) {
      alert('Ошибка: данные не готовы для сохранения.');
      return;
    }

    try {
      const picksToSave = picks.map((p) => ({
        tournament_id: tournament.id,
        round: p.round,
        match_number: p.match_number,
        player1: p.player1 || "",
        player2: p.player2 || "",
        predicted_winner: p.predicted_winner || "",
      }));

      const response = await fetch('https://primechallenge.onrender.com/picks/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
        },
        body: JSON.stringify(picksToSave),
      });

      if (!response.ok) throw new Error(`Ошибка при сохранении: ${await response.text()}`);
      const responseData = await response.json();
      if (responseData.status !== 'success') throw new Error('Сохранение не удалось');

      const picksRes = await fetch(`https://primechallenge.onrender.com/picks/?tournament_id=${tournament.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
        },
      });
      if (picksRes.ok) {
        const userPicks: Pick[] = await picksRes.json();
        const updatedPicks = [...picks];
        userPicks.forEach((userPick) => {
          const matchIndex = updatedPicks.findIndex((p) => p.round === userPick.round && p.match_number === userPick.match_number);
          if (matchIndex !== -1) {
            updatedPicks[matchIndex] = {
              ...updatedPicks[matchIndex],
              player1: userPick.player1 || updatedPicks[matchIndex].player1,
              player2: userPick.player2 || updatedPicks[matchIndex].player2,
              predicted_winner: userPick.predicted_winner || "",
            };
          } else {
            updatedPicks.push({
              tournament_id: tournament.id,
              round: userPick.round,
              match_number: userPick.match_number,
              player1: userPick.player1 || "",
              player2: userPick.player2 || "",
              predicted_winner: userPick.predicted_winner || "",
              winner: "",
            });
          }
        });
        setPicks(updatedPicks);
      }

      alert('Пики успешно сохранены!');
    } catch (err) {
      alert(`Ошибка при сохранении: ${(err as Error).message}`);
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