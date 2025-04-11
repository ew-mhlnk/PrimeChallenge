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
        initData: string;
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
  type DebugInfo = {
    initData: string;
    initDataUnsafe: {
      user?: {
        id: number;
        first_name: string;
      };
    };
  };
  
  const [debug, setDebug] = useState<DebugInfo | null>(null);

  // 🔍 Ранняя проверка window.Telegram
  if (typeof window !== 'undefined') {
    console.log(">>> [init] Telegram WebApp early check:", window.Telegram?.WebApp);
  }

  useEffect(() => {
    const initTelegram = async () => {
      const webApp = window.Telegram?.WebApp;
      if (!webApp) {
        console.warn('❌ window.Telegram.WebApp не найден');
        return;
      }

      webApp.ready();

      const initData = webApp.initData;
      const initDataUnsafe = webApp.initDataUnsafe;
      const tgUser = initDataUnsafe?.user;

      console.log('✅ Telegram WebApp найден');
      console.log('initData:', initData);
      console.log('initDataUnsafe:', initDataUnsafe);

      setDebug({ initData, initDataUnsafe });
      setIsTelegram(true);

      if (tgUser) {
        setUser({ id: tgUser.id, firstName: tgUser.first_name });

        try {
          const response = await fetch('https://primechallenge.onrender.com/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData }),
          });
          const data = await response.json();

          console.log('Auth response:', data);
          if (!response.ok || data.status !== 'ok') {
            console.error('Auth failed:', data);
          }
        } catch (error) {
          console.error('Fetch error:', error);
        }
      } else {
        console.warn('Telegram user is undefined');
        setUser({ id: 0, firstName: 'Гость' });
      }
    };

    const waitForTelegram = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        initTelegram();
      } else {
        console.log('⏳ Telegram WebApp не готов. Повтор через 500ms...');
        setTimeout(waitForTelegram, 500);
      }
    };

    waitForTelegram();

    fetch('/api/tournaments')
      .then((res) => res.json())
      .then((data: Tournament[]) => setTournaments(data))
      .catch((err) => console.error('Ошибка загрузки турниров:', err));
  }, []);

  // ⚠️ Пока Telegram не определён, показываем "ожидание"
  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
        <p className="text-xl mb-4 text-center">
          Проверяем Telegram WebApp...<br />
          Открой через Telegram-бота:
        </p>
        <a href="https://t.me/PrimeBracketBot" className="text-cyan-400 underline">
          @PrimeBracketBot
        </a>
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

      {/* 🐞 Debug info */}
      {debug && (
        <pre className="text-sm text-gray-400 bg-gray-800 p-2 rounded mb-6 overflow-x-auto">
          {JSON.stringify(debug, null, 2)}
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
