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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('>>> [init] Starting Telegram WebApp initialization...');

    // Загрузка турниров
    console.log('>>> [tournaments] Loading tournaments...');
    fetch('https://primechallenge.onrender.com/tournaments/', { mode: 'no-cors' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch tournaments: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Tournament[]) => {
        console.log('>>> [tournaments] Tournaments loaded:', data);
        setTournaments(data);
      })
      .catch((err) => console.error('>>> [tournaments] Ошибка загрузки турниров:', err))
      .finally(() => setIsLoading(false));

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
              const response = await fetch('https://primechallenge.onrender.com/auth/', {
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
          <p className="text-gray-400">Нет доступных турниров</p>
        )}
      </section>
    </div>
  );
}