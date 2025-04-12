'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

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
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debug, setDebug] = useState<{
    initData: string;
    initDataUnsafe: {
      user?: {
        id: number;
        first_name: string;
      };
    };
  } | null>(null);

  useEffect(() => {
    const initTelegram = async () => {
      console.log('>>> [init] Checking for Telegram WebApp...');
      if (typeof window !== 'undefined') {
        let attempts = 0;
        const maxAttempts = 5;

        const checkTelegram = async () => {
          attempts++;
          if (window.Telegram?.WebApp) {
            console.log('✅ Telegram WebApp найден');
            const webApp = window.Telegram.WebApp;
            webApp.ready();
            const initData = webApp.initData;
            const initDataUnsafe = webApp.initDataUnsafe;
            const tgUser = initDataUnsafe?.user;

            console.log('initData:', initData);
            console.log('initDataUnsafe:', initDataUnsafe);
            setDebug({ initData, initDataUnsafe });
            setIsTelegram(true);

            if (tgUser && initData) {
              setUser({ id: tgUser.id, firstName: tgUser.first_name });
              try {
                console.log('>>> [auth] Sending auth request...');
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
          } else if (attempts < maxAttempts) {
            console.log(`⏳ Telegram WebApp не готов. Попытка ${attempts}/${maxAttempts}...`);
            setTimeout(checkTelegram, 500);
            return;
          } else {
            console.log('>>> [init] No Telegram WebApp after max attempts');
            setIsTelegram(false);
            setUser({ id: 0, firstName: 'Гость' });
          }
          setIsLoading(false);
        };

        checkTelegram();
      } else {
        console.log('>>> [init] Window is undefined');
        setIsTelegram(false);
        setUser({ id: 0, firstName: 'Гость' });
        setIsLoading(false);
      }
    };

    initTelegram();

    // Загрузка турниров независимо от Telegram
    console.log('>>> [tournaments] Loading tournaments...');
    fetch('/api/tournaments')
      .then((res) => res.json())
      .then((data: Tournament[]) => {
        console.log('>>> [tournaments] Tournaments loaded:', data);
        setTournaments(data);
      })
      .catch((err) => console.error('Ошибка загрузки турниров:', err));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-center">Загрузка...</p>
      </div>
    );
  }

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
    <>
      <Head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </Head>
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Prime Bracket Challenge
          </h1>
          <p className="text-gray-400 mt-2">
            {user ? `Привет, ${user.firstName}!` : 'Загрузка пользователя...'}
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
    </>
  );
}