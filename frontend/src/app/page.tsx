'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  firstName: string;
}

interface Tournament {
  id: number;
  name: string;
  dates: string;
  status: string;
}

interface Match {
  id: number;
  round: string;
  match_number: number;
  player1: string;
  player2: string;
  score: string | null;
  winner: string | null;
  predicted_winner?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentRound, setCurrentRound] = useState<string>('R64');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('>>> [init] Starting Telegram WebApp initialization...');

    // Загрузка турниров
    console.log('>>> [tournaments] Loading tournaments...');
    fetch('https://primechallenge.onrender.com/tournaments', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}, Message: ${await res.text()}`);
        }
        return res.json();
      })
      .then((data: Tournament[]) => {
        console.log('>>> [tournaments] Tournaments loaded:', data);
        setTournaments(data);
      })
      .catch((err) => {
        console.error('>>> [tournaments] Ошибка загрузки турниров:', err);
        setError('Не удалось загрузить турниры. Попробуйте позже.');
      });

    const initTelegram = async () => {
      if (typeof window === 'undefined') {
        console.log('>>> [init] Window is undefined, skipping Telegram check');
        setUser({ id: 0, firstName: 'Гость' });
        setIsLoading(false);
        return;
      }

      let attempts = 0;
      const maxAttempts = 50;
      const attemptInterval = 100;

      const checkTelegram = async () => {
        attempts++;
        console.log(`>>> [init] Attempt ${attempts}/${maxAttempts} to find Telegram WebApp...`);

        if (window.Telegram?.WebApp) {
          console.log('✅ Telegram WebApp found');
          const webApp = window.Telegram.WebApp;
          webApp.ready();
          const initData = webApp.initData;
          const initDataUnsafe = webApp.initDataUnsafe;
          const tgUser = initDataUnsafe?.user;

          console.log('>>> [init] initData:', initData);
          console.log('>>> [init] initDataUnsafe:', initDataUnsafe);

          if (tgUser && initData) {
            console.log('>>> [auth] User found, attempting authentication...');
            try {
              const response = await fetch('https://primechallenge.onrender.com/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData }),
              });
              const data = await response.json();
              console.log('🔐 Auth response:', data);

              if (response.ok && data.status === 'ok') {
                console.log('>>> [auth] Authentication successful');
                setUser({ id: data.user_id, firstName: tgUser.first_name });
              } else {
                console.error('❌ Auth failed:', data);
                setUser({ id: 0, firstName: 'Гость' });
              }
            } catch (error) {
              console.error('❌ Fetch error:', error);
              setUser({ id: 0, firstName: 'Гость' });
            }
          } else {
            console.warn('⚠️ No user or initData available');
            setUser({ id: 0, firstName: 'Гость' });
          }
          setIsLoading(false);
        } else if (attempts < maxAttempts) {
          console.log(`>>> [init] Telegram WebApp not found, retrying in ${attemptInterval}ms...`);
          setTimeout(checkTelegram, attemptInterval);
        } else {
          console.log('>>> [init] Telegram WebApp not found after all attempts');
          setUser({ id: 0, firstName: 'Гость' });
          setIsLoading(false);
        }
      };

      checkTelegram();

      const existingScript = document.querySelector('script[src="https://telegram.org/js/telegram-web-app.js"]');
      if (!existingScript) {
        console.log('>>> [init] Loading Telegram WebApp script...');
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-web-app.js';
        script.async = true;
        script.onload = () => {
          console.log('>>> [init] Telegram WebApp script loaded');
          checkTelegram();
        };
        script.onerror = () => {
          console.error('>>> [init] Failed to load Telegram WebApp script');
          setUser({ id: 0, firstName: 'Гость' });
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } else {
        console.log('>>> [init] Telegram WebApp script already present');
        checkTelegram();
      }
    };

    initTelegram();
  }, []);

  const loadMatches = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setCurrentRound('R64');
    console.log(`>>> [matches] Loading matches for tournament ${tournament.id}`);
    try {
      const response = await fetch(`https://primechallenge.onrender.com/tournaments/${tournament.id}/matches`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('>>> [matches] Matches loaded:', data);
      setMatches(data.map((m: Match) => ({ ...m, predicted_winner: '' })));
    } catch (err) {
      console.error('>>> [matches] Ошибка загрузки матчей:', err);
      setMatches([]);
      setError('Не удалось загрузить матчи. Попробуйте позже.');
    }
  };

  const selectWinner = (matchId: number, player: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId ? { ...m, predicted_winner: player } : m
      )
    );
  };

  const savePicks = async () => {
    const roundMatches = matches.filter((m) => m.round === currentRound);
    if (roundMatches.some((m) => !m.predicted_winner)) {
      alert('Пожалуйста, выберите победителя для каждого матча в этом раунде.');
      return;
    }
    console.log('>>> [picks] Saving picks...');
    try {
      const response = await fetch('https://primechallenge.onrender.com/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: window.Telegram.WebApp.initData,
          picks: roundMatches.map((m) => ({
            match_id: m.id,
            predicted_winner: m.predicted_winner,
          })),
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('>>> [picks] Picks saved:', data);
      alert('Ваши пики сохранены!');
    } catch (err) {
      console.error('>>> [picks] Ошибка сохранения пиков:', err);
      alert('Ошибка при сохранении пиков.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-center">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Prime Bracket Challenge
        </h1>
        <p className="text-gray-400 mt-2">
          {user ? `Привет, ${user.firstName}!` : 'Загрузка пользователя...'}
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500 text-white rounded-lg">
          {error}
        </div>
      )}

      {!selectedTournament ? (
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.length > 0 ? (
            tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer"
                onClick={() => loadMatches(tournament)}
              >
                <h2 className="text-xl font-semibold text-white">{tournament.name}</h2>
                <p className="text-gray-400">{tournament.dates}</p>
                <span
                  className={`mt-2 inline-block px-2 py-1 rounded text-sm ${
                    tournament.status === 'Активен'
                      ? 'bg-green-500'
                      : tournament.status === 'Закрыт'
                      ? 'bg-yellow-500'
                      : 'bg-gray-500'
                  }`}
                >
                  {tournament.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-400">Турниры загружаются...</p>
          )}
        </section>
      ) : (
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              {selectedTournament.name}{' '}
              {selectedTournament.status === 'Активен' && (
                <span className="text-red-500">[LIVE]</span>
              )}
            </h2>
            <p className="text-gray-400">{selectedTournament.dates}</p>
            <button
              className="mt-2 text-blue-400 underline"
              onClick={() => setSelectedTournament(null)}
            >
              Назад к турнирам
            </button>
          </div>
          <div className="flex gap-2 mb-6">
            {['R64', 'R32', 'R16', 'QF', 'SF', 'F'].map((round) => (
              <button
                key={round}
                className={`px-4 py-2 rounded ${
                  currentRound === round ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'
                }`}
                onClick={() => setCurrentRound(round)}
              >
                {round}
              </button>
            ))}
          </div>
          <div className="grid gap-4">
            {matches
              .filter((m) => m.round === currentRound)
              .map((match) => (
                <div key={match.id} className="bg-gray-800 p-4 rounded-lg">
                  <p className="text-white">
                    {match.player1}{' '}
                    {match.score && <span className="text-gray-400">[{match.score.split(' vs ')[0]}]</span>}
                    <button
                      className={`ml-2 px-2 py-1 rounded ${
                        match.predicted_winner === match.player1
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-300'
                      } ${selectedTournament.status !== 'Активен' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => selectWinner(match.id, match.player1)}
                      disabled={selectedTournament.status !== 'Активен'}
                    >
                      Выбрать
                    </button>
                  </p>
                  <p className="text-white">
                    {match.player2}{' '}
                    {match.score && <span className="text-gray-400">[{match.score.split(' vs ')[1]}]</span>}
                    <button
                      className={`ml-2 px-2 py-1 rounded ${
                        match.predicted_winner === match.player2
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-300'
                      } ${selectedTournament.status !== 'Активен' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => selectWinner(match.id, match.player2)}
                      disabled={selectedTournament.status !== 'Активен'}
                    >
                      Выбрать
                    </button>
                  </p>
                  {match.winner && (
                    <p className="text-green-500 mt-2">Победитель: {match.winner}</p>
                  )}
                </div>
              ))}
          </div>
          {selectedTournament.status === 'Активен' && (
            <button
              className="mt-6 bg-blue-500 text-white px-6 py-2 rounded"
              onClick={savePicks}
            >
              Сохранить
            </button>
          )}
        </section>
      )}
    </div>
  );
}