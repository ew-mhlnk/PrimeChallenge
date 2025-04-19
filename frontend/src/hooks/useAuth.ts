import { useState, useEffect } from 'react';
import { User } from '@/types';

// Определяем интерфейс для tgUser, который приходит из Telegram
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_bot?: boolean;
}

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initTelegram = async () => {
      if (typeof window === 'undefined') {
        console.log('>>> [init] Window is undefined, skipping Telegram check');
        setUser({ id: 0, telegram_id: 0, first_name: 'Гость', last_name: null, username: null });
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
          const tgUser = initDataUnsafe?.user as TelegramUser | undefined; // Явно указываем тип

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
                setUser({
                  id: data.user_id,
                  telegram_id: tgUser.id,
                  first_name: tgUser.first_name,
                  last_name: tgUser.last_name || null,
                  username: tgUser.username || null,
                });
              } else {
                console.error('❌ Auth failed:', data);
                setUser({ id: 0, telegram_id: 0, first_name: 'Гость', last_name: null, username: null });
              }
            } catch (error) {
              console.error('❌ Fetch error:', error);
              setUser({ id: 0, telegram_id: 0, first_name: 'Гость', last_name: null, username: null });
              setError('Ошибка авторизации. Попробуйте позже.');
            }
          } else {
            console.warn('⚠️ No user or initData available');
            setUser({ id: 0, telegram_id: 0, first_name: 'Гость', last_name: null, username: null });
          }
          setIsLoading(false);
        } else if (attempts < maxAttempts) {
          console.log(`>>> [init] Telegram WebApp not found, retrying in ${attemptInterval}ms...`);
          setTimeout(checkTelegram, attemptInterval);
        } else {
          console.log('>>> [init] Telegram WebApp not found after all attempts');
          setUser({ id: 0, telegram_id: 0, first_name: 'Гость', last_name: null, username: null });
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
          setUser({ id: 0, telegram_id: 0, first_name: 'Гость', last_name: null, username: null });
          setIsLoading(false);
          setError('Не удалось загрузить Telegram WebApp.');
        };
        document.head.appendChild(script);
      } else {
        console.log('>>> [init] Telegram WebApp script already present');
        checkTelegram();
      }
    };

    initTelegram();
  }, []);

  return { user, isLoading, error };
}