'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Тип для пользователя
interface User {
  id: number;
  firstName: string;
}

// Тип для турнира
interface Tournament {
  id: number;
  name: string;
  date: string;
  active: boolean;
}

// Расширяем тип Window для Telegram Web App
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
          };
        };
      };
    };
  }
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    // Аутентификация через Telegram Web App
    if (window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      const initData = webApp.initDataUnsafe;
      if (initData?.user) {
        setUser({
          id: initData.user.id,
          firstName: initData.user.first_name,
        });
      } else {
        setUser({ id: 0, firstName: 'Гость' });
      }
    }

    // Загружаем турниры
    fetch('/api/tournaments')
      .then((res) => res.json())
      .then((data: Tournament[]) => setTournaments(data))
      .catch((err) => console.error('Ошибка загрузки турниров:', err));
  }, []);

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