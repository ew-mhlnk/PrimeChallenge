import { useState, useEffect } from 'react';

interface User {
  id: number;
  firstName: string;
  username?: string;
}

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Ждём, пока Telegram WebApp скрипт загрузится
        const waitForTelegramScript = () => {
          return new Promise<void>((resolve, reject) => {
            const startTime = Date.now();
            const timeout = 5000; // Таймаут 5 секунд

            const checkScript = () => {
              if (window.Telegram?.WebApp) {
                console.log('Telegram WebApp script loaded successfully');
                resolve();
              } else if (Date.now() - startTime > timeout) {
                console.error('Failed to load Telegram WebApp script within timeout');
                reject(new Error('Failed to load Telegram WebApp script within timeout'));
              } else {
                setTimeout(checkScript, 100);
              }
            };

            checkScript();
          });
        };

        await waitForTelegramScript();

        // После проверки выше мы уверены, что Telegram.WebApp существует
        const telegram = window.Telegram!.WebApp;
        telegram.ready();

        const initData = telegram.initData;
        if (!initData) {
          throw new Error('Telegram initData not available');
        }

        const telegramUser = telegram.initDataUnsafe.user;
        if (!telegramUser) {
          throw new Error('Telegram user data not available in initDataUnsafe');
        }

        setUser({
          id: telegramUser.id,
          firstName: telegramUser.first_name,
        });

        // === ИЗМЕНЕНИЕ: Используем прокси /api/auth/ ===
        const response = await fetch('/api/auth/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData }),
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate with backend');
        }

        const userData = await response.json();
        setUser({
          id: userData.user_id,
          firstName: userData.first_name,
          username: userData.username,
        });

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        console.error('Authentication error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return { user, isLoading, error };
}