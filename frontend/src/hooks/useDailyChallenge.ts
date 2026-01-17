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

  const isFirstLoad = useRef(true);
  const debounceRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchMatches = useCallback(async () => {
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
          
          if (!res.ok) {
              if (res.status === 401 || res.status === 403) {
                  // Если токен протух при загрузке - можно перезагрузить
                  window.location.reload();
                  return;
              }
              throw new Error('Failed to fetch');
          }
          
          const data: DailyMatch[] = await res.json();
          setMatches(data);

          const hasLive = data.some(m => m.status === 'LIVE');
          const allFinished = data.length > 0 && data.every(m => m.status === 'COMPLETED');
          
          if (hasLive) setDayStatus('ACTIVE');
          else if (allFinished) setDayStatus('COMPLETED');
          else setDayStatus('PLANNED');

      } catch (e) {
          console.error(e);
          if (isFirstLoad.current) {
              // toast.error('Ошибка загрузки матчей');
          }
      } finally {
          setIsLoading(false);
          isFirstLoad.current = false;
      }
  }, [selectedDate]);

  useEffect(() => {
      isFirstLoad.current = true;
      fetchMatches();
      const intervalId = setInterval(() => {
          fetchMatches();
      }, 30000);
      return () => clearInterval(intervalId);
  }, [fetchMatches]);

  const makePick = useCallback(async (matchId: string, winner: 1 | 2) => {
      impact('medium');
      
      // Оптимистичное обновление
      setMatches(prev => prev.map(m => 
          m.id === matchId ? { ...m, my_pick: winner } : m
      ));

      if (debounceRefs.current[matchId]) {
          clearTimeout(debounceRefs.current[matchId]);
      }

      debounceRefs.current[matchId] = setTimeout(async () => {
          try {
              const initData = window.Telegram?.WebApp?.initData;
              if (!initData) throw new Error('AUTH_EXPIRED');

              const res = await fetch('/api/daily/pick', {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      Authorization: initData 
                  },
                  body: JSON.stringify({ match_id: matchId, winner })
              });
              
              if (!res.ok) {
                  const err = await res.json();
                  if (res.status === 401 || res.status === 403) {
                      throw new Error('AUTH_EXPIRED');
                  }
                  throw new Error(err.detail || 'Save failed');
              }
          } catch (e: any) {
              console.error(e);
              notification('error');
              
              if (e.message === 'AUTH_EXPIRED') {
                  toast.error('Сессия истекла. Обновляю...');
                  setTimeout(() => window.location.reload(), 1500);
              } else if (e.message === 'Match started' || e.message === 'Time expired') {
                  toast.error('Матч уже начался!');
              } else {
                  toast.error('Ошибка сохранения');
              }
              
              fetchMatches(); 
          } finally {
              delete debounceRefs.current[matchId];
          }
      }, 500);
  }, [fetchMatches, impact, notification]);

  return { matches, dayStatus, isLoading, makePick, refresh: fetchMatches, selectedDate, setSelectedDate };
}