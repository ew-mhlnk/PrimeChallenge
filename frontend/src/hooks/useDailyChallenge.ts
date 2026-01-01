'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { DailyMatch } from '@/types';

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
  const [dayStatus, setDayStatus] = useState<'PLANNED' | 'ACTIVE' | 'COMPLETED'>('PLANNED');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Используем ref, чтобы понимать, первый это запуск или нет
  const isFirstLoad = useRef(true);

  const fetchMatches = useCallback(async () => {
      // Показываем спиннер ТОЛЬКО если это первая загрузка или смена даты
      // Если это фоновое обновление (раз в 30 сек), спиннер не нужен
      if (isFirstLoad.current) {
          setIsLoading(true);
      }

      try {
          const initData = await waitForTelegram();
          
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

          const hasLive = data.some(m => m.status === 'LIVE');
          const allFinished = data.length > 0 && data.every(m => m.status === 'COMPLETED');
          
          if (hasLive) setDayStatus('ACTIVE');
          else if (allFinished) setDayStatus('COMPLETED');
          else setDayStatus('PLANNED');

      } catch (e) {
          console.error(e);
          // Не спамим ошибками в тостах при фоновом обновлении
          if (isFirstLoad.current) {
              toast.error('Ошибка загрузки матчей');
          }
      } finally {
          setIsLoading(false);
          isFirstLoad.current = false; // Первая загрузка прошла
      }
  }, [selectedDate]);

  // ЭФФЕКТ: Загрузка + Автообновление
  useEffect(() => {
      // 1. Загружаем сразу
      isFirstLoad.current = true; // Сбрасываем флаг при смене даты
      fetchMatches();

      // 2. Ставим таймер на обновление каждые 30 секунд
      const intervalId = setInterval(() => {
          fetchMatches();
      }, 30000); // 30000 мс = 30 секунд

      // 3. Очищаем таймер, если ушли со страницы
      return () => clearInterval(intervalId);
  }, [fetchMatches]);

  const makePick = async (matchId: string, winner: 1 | 2) => {
      impact('medium');
      
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
      selectedDate,
      setSelectedDate
  };
}