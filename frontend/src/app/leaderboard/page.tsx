'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '@/types';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          throw new Error('Telegram initData not available');
        }

        const response = await fetch('https://primechallenge.onrender.com/leaderboard/', {
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
              <p>Пользователь: {entry.username}</p>
              <p>Очки: {entry.score}</p>
              <p>Правильные пики: {entry.correct_picks}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}