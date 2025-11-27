import { useState, useEffect } from 'react';

// Тип для нашего состояния пользователя внутри React
interface User {
  id: number;
  firstName: string;
  username?: string;
  photoUrl?: string;
}

// Тип для "сырых" данных от Telegram (чтобы не использовать any)
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const waitForTelegramScript = () => {
          return new Promise<void>((resolve, reject) => {
            const startTime = Date.now();
            const timeout = 5000;
            const checkScript = () => {
              if (window.Telegram?.WebApp) {
                resolve();
              } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout'));
              } else {
                setTimeout(checkScript, 100);
              }
            };
            checkScript();
          });
        };

        await waitForTelegramScript();
        const telegram = window.Telegram!.WebApp;
        telegram.ready();

        const initData = telegram.initData;
        
        // ИСПРАВЛЕНИЕ: Используем `unknown`, затем наш интерфейс `TelegramUser`.
        // Это безопасный способ сказать TypeScript: "Я знаю структуру этого объекта лучше тебя".
        const telegramUser = telegram.initDataUnsafe.user as unknown as TelegramUser;

        if (telegramUser) {
            setUser({
              id: telegramUser.id,
              firstName: telegramUser.first_name,
              username: telegramUser.username, 
              photoUrl: telegramUser.photo_url
            });
        }

        if (initData) {
            await fetch('/api/auth/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData }),
            });
        }

      } catch (err) {
        // Чтобы линтер не ругался на unused var, выводим ошибку в консоль
        console.error('Auth error:', err);
        setError('Auth failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return { user, isLoading, error };
}