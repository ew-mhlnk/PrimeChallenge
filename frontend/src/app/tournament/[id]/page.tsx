'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        initData: string; // Подписанные данные
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
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const initTelegram = async () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const webApp = window.Telegram.WebApp;
        webApp.ready();
        const initData = webApp.initData; // Подписанные данные
        const user = webApp.initDataUnsafe?.user;
        setIsTelegram(true);

        if (user) {
          setUser({ id: user.id, firstName: user.first_name });
          // Отправка на бэкенд
          await fetch('https://primechallenge.onrender.com/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
        } else {
          setUser({ id: 0, firstName: 'Гость' });
        }
      } else {
        setIsTelegram(false);
      }
    };

    if (typeof window !== 'undefined') {
      if (window.Telegram?.WebApp) {
        initTelegram();
      } else {
        setTimeout(() => {
          if (!window.Telegram?.WebApp) initTelegram();
        }, 2000);
      }
    }

    fetch('/api/tournaments')
      .then((res) => res.json())
      .then((data: Tournament[]) => setTournaments(data))
      .catch((err) => console.error('Ошибка загрузки турниров:', err));
  }, []);

  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Открой меня в Telegram: <a href="https://t.me/your_bot" className="text-cyan-400">t.me/your_bot</a></p>
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