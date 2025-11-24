'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '@/types';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Добавляем простую проверку на window, чтобы не падал SSR
        if (typeof window === 'undefined') return;

        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          // Если мы не в телеграме, можно просто выйти или кинуть ошибку,
          // но лучше не ломать приложение ошибкой "initData not available" при обычной разработке
          console.warn('Telegram initData not available');
          return; 
        }

        // === ИЗМЕНЕНИЕ: Используем прокси /api/leaderboard/ ===
        const response = await fetch('/api/leaderboard/', {
          headers: {
            Authorization: initData,
          },
        });
        
        if (!response.ok) {
          throw new Error('Ошибка при загрузке лидерборда');
        }
        const data: LeaderboardEntry[] = await response.json();
        setLeaderboard(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(message);
      }
    };

    fetchLeaderboard();
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!leaderboard) {
    return <p>Загрузка лидерборда...</p>;
  }

  return (
    <div className="container mx-auto p-4 text-white">
      <h1 className="text-3xl font-bold mb-6">Лидерборд</h1>
      {leaderboard.length === 0 ? (
        <p>Лидерборд пуст</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {leaderboard.map((entry) => (
            <div key={entry.user_id} className="bg-gray-800 p-4 rounded-lg shadow-md">
              <p>Место: {entry.rank}</p>
              <p>Пользователь: {entry.username || entry.user_id}</p>
              <p>Очки: {entry.score}</p>
              <p>Правильные пики: {entry.correct_picks}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}