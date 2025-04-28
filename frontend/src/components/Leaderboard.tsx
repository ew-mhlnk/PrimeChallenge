'use client';

import { useState, useEffect } from 'react';
import { LeaderboardEntry, Tournament } from '@/types';

interface LeaderboardProps {
  tournaments: Tournament[];
}

export default function Leaderboard({ tournaments }: LeaderboardProps) {
  const [selectedTag, setSelectedTag] = useState<string>('ATP');
  const [leaderboards, setLeaderboards] = useState<{ [tournamentId: number]: LeaderboardEntry[] }>({});

  // Фильтруем завершенные турниры по тегу
  const completedTournaments = tournaments.filter(
    (t) => t.status === 'COMPLETED' && t.tag === selectedTag
  );

  // Загружаем лидерборд для каждого турнира
  useEffect(() => {
    const fetchLeaderboards = async () => {
      const newLeaderboards: { [tournamentId: number]: LeaderboardEntry[] } = {};
      for (const tournament of completedTournaments) {
        try {
          const response = await fetch(
            `https://primechallenge.onrender.com/results/leaderboard?tournament_id=${tournament.id}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            newLeaderboards[tournament.id] = data;
          }
        } catch (error) {
          console.error(`Error fetching leaderboard for tournament ${tournament.id}:`, error);
        }
      }
      setLeaderboards(newLeaderboards);
    };

    fetchLeaderboards();
  }, [selectedTag, completedTournaments]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Лидерборд</h1>

      {/* Кнопки для выбора тега */}
      <div className="flex space-x-2 mb-4">
        {['ATP', 'WTA', 'ТБШ'].map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-4 py-2 rounded ${
              selectedTag === tag ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {completedTournaments.length === 0 ? (
        <p>Нет завершенных турниров для тега {selectedTag}</p>
      ) : (
        completedTournaments.map((tournament) => (
          <div key={tournament.id} className="mb-6">
            <h2 className="text-xl font-semibold">{tournament.name}</h2>
            <p>{tournament.dates}</p>
            {leaderboards[tournament.id] ? (
              <div className="mt-2">
                {leaderboards[tournament.id].map((entry) => (
                  <div
                    key={entry.user_id}
                    className="flex justify-between p-2 border-b border-gray-600"
                  >
                    <span>
                      {entry.rank}. {entry.username}
                    </span>
                    <span>
                      Очки: {entry.score}, Верные пики: {entry.correct_picks}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Загрузка лидерборда...</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}