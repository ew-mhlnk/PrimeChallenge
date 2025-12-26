'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { DailyMatch } from '@/types';

// Хелпер для ожидания Telegram initData
const waitForTelegram = async () => {
    for (let i = 0; i < 20; i++) {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
            return window.Telegram.WebApp.initData;
        }
        await new Promise(r => setTimeout(r, 100));
    }
    return '';
};

export function useDailyChallenge() {
  const [matches, setMatches] = useState<DailyMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { impact, notification } = useHapticFeedback();

  // Глобальный статус страницы
  const [dayStatus, setDayStatus] = useState<'PLANNED' | 'ACTIVE' | 'COMPLETED'>('PLANNED');

  const fetchMatches = useCallback(async () => {
      try {
          const initData = await waitForTelegram();
          
          // Запрос к нашему новому API
          const res = await fetch('/api/daily/matches', {
              headers: { Authorization: initData || '' },
              cache: 'no-store'
          });
          
          if (!res.ok) throw new Error('Failed to fetch');
          
          const data: DailyMatch[] = await res.json();
          setMatches(data);

          // ЛОГИКА ОПРЕДЕЛЕНИЯ СТАТУСА ДНЯ:
          // 1. Если есть хоть один LIVE -> ACTIVE (показываем лайв)
          // 2. Если ВСЕ матчи COMPLETED -> COMPLETED (показываем итоги)
          // 3. Иначе -> PLANNED (принимаем ставки)
          
          const hasLive = data.some(m => m.status === 'LIVE');
          const allFinished = data.length > 0 && data.every(m => m.status === 'COMPLETED');
          
          if (hasLive) setDayStatus('ACTIVE');
          else if (allFinished) setDayStatus('COMPLETED');
          else setDayStatus('PLANNED');

      } catch (e) {
          console.error(e);
          toast.error('Не удалось загрузить матчи');
      } finally {
          setIsLoading(false);
      }
  }, []);

  // Первичная загрузка
  useEffect(() => {
      fetchMatches();
  }, [fetchMatches]);

  // Функция выбора победителя
  const makePick = async (matchId: string, winner: 1 | 2) => {
      impact('medium');
      
      // 1. Оптимистичное обновление (сразу красим кнопку в UI)
      const previousMatches = [...matches];
      setMatches(prev => prev.map(m => 
          m.id === matchId ? { ...m, my_pick: winner } : m
      ));

      try {
          const initData = await waitForTelegram();
          const res = await fetch('/api/daily/pick', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  Authorization: initData || '' 
              },
              body: JSON.stringify({ match_id: matchId, winner })
          });
          
          if (!res.ok) {
              const err = await res.json();
              throw new Error(err.detail || 'Too late');
          }
          
          notification('success');
      } catch (e: any) {
          notification('error');
          toast.error(e.message === 'Too late' ? 'Прием ставок закрыт' : 'Ошибка сохранения');
          
          // 2. Если ошибка — откатываем UI назад
          setMatches(previousMatches);
          // И обновляем данные с сервера, чтобы получить актуальные статусы
          fetchMatches(); 
      }
  };

  return { matches, dayStatus, isLoading, makePick, refresh: fetchMatches };
}