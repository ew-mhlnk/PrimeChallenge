'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { retrieveRawInitData } from '@tma.js/sdk'; // или '@telegram-apps/sdk'

interface User {
  id: number;
  firstName: string;
}

interface Tournament {
  id: number;
  name: string;
  date: string;
  active: boolean;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isTelegram, setIsTelegram] = useState(false);
  const [debug, setDebug] = useState<string | null>(null);

  useEffect(() => {
    const initTelegram = async () => {
      try {
        const initData = retrieveRawInitData(); // строка initData из Telegram
        if (!initData || initData.length === 0) {
          console.warn('Telegram WebApp не готов');
          return;
        }

        setDebug(initData);
        setIsTelegram(true);

        const response = await fetch('https://primechallenge.onrender.com/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });

        const data = await response.json();

        if (response.ok && data.status === 'ok') {
          setUser({ id: data.user_id, firstName: data.first_name });
        } else {
          console.error('Auth failed:', data);
        }
      } catch (err) {
        console.error('Ошибка инициализации Telegram:', err);
      }
    };

    initTelegram();

    fetch('/api/tournaments')
      .then((res) => res.json())
      .then((data: Tournament[]) => setTournaments(data))
      .catch((err) => console.error('Ошибка загрузки турниров:', err));
  }, []);

  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-center">
          Открой меня в Telegram:{' '}
          <a href="https://t.me/PrimeBracketBot" className="text-cyan-400 underline">
            t.me/PrimeBracketBot
          </a>
        </p>
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
          {user ? `Привет, ${user.firstName}!` : 'Загрузка...'}
        </p>
      </header>

      {debug && (
        <pre className="text-sm text-gray-400 bg-gray-800 p-2 rounded mb-6 overflow-x-auto">
          {debug}
        </pre>
      )}

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.length > 0 ? (
          tournaments.map((tournament) => (
            <Link href={`/tournament/${tournament.id}`} key={tournament.id}>
              <div className="bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer">
                <h2 className="text-xl font-semibold text-white">{tournament.name}</h2>
                <p className="text-gray-400">{tournament.date}</p>
                <span
                  className={`mt-2 inline-block px-2 py-1 rounded text-sm ${
                    tournament.active ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                >
                  {tournament.active ? 'Активен' : 'Завершён'}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-gray-400">Турниры загружаются...</p>
        )}
      </section>
    </div>
  );
}
