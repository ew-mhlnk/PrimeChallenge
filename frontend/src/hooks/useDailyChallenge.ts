'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { DailyMatch } from '@/types';

// Хелпер для Telegram InitData
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

  // Статус дня: PLANNED (ставки), ACTIVE (лайв), COMPLETED (итоги)
  const [dayStatus, setDayStatus] = useState<'PLANNED' | 'ACTIVE' | 'COMPLETED'>('PLANNED');

  // Выбранная дата (по умолчанию сегодня)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const fetchMatches = useCallback(async () => {
      setIsLoading(true);
      try {
          const initData = await waitForTelegram();
          
          // Форматируем дату в YYYY-MM-DD для API
          // Используем локальные методы getFullYear/Month/Date, чтобы получить дату пользователя
          const year = selectedDate.getFullYear();
          const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const day = String(selectedDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;

          const res = await fetch(`/api/daily/matches?target_date=${dateStr}`, {
              headers: { Authorization: initData || '' },
              cache: 'no-store'
          });
          
          if (!res.ok) throw new Error('Failed to fetch');
          
          const data: DailyMatch[] = await res.json();
          setMatches(data);

          // Логика переключения статуса страницы
          const hasLive = data.some(m => m.status === 'LIVE');
          const allFinished = data.length > 0 && data.every(m => m.status === 'COMPLETED');
          
          if (hasLive) setDayStatus('ACTIVE');
          else if (allFinished) setDayStatus('COMPLETED');
          else setDayStatus('PLANNED');

      } catch (e) {
          console.error(e);
          toast.error('Ошибка загрузки матчей');
      } finally {
          setIsLoading(false);
      }
  }, [selectedDate]); // <-- Перезапрос при смене даты

  // Первичная загрузка
  useEffect(() => {
      fetchMatches();
  }, [fetchMatches]);

  const makePick = async (matchId: string, winner: 1 | 2) => {
      impact('medium');
      
      // Оптимистичное обновление UI
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
          
          // Откат при ошибке
          setMatches(previousMatches);
          fetchMatches(); 
      }
  };

  return { 
      matches, 
      dayStatus, 
      isLoading, 
      makePick, 
      refresh: fetchMatches,
      selectedDate,      // Экспортируем дату
      setSelectedDate    // Экспортируем сеттер даты
  };
}