'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tournament } from '@/types';
import useMatches from '@/hooks/useMatches';

export default function TournamentPage() {
  const { id } = useParams(); // Получаем ID турнира из URL
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoadingTournament, setIsLoadingTournament] = useState(true);
  const { matches, error } = useMatches(tournament); // Передаём tournament напрямую

  useEffect(() => {
    setIsLoadingTournament(true);
    console.log('>>> [tournament] Fetching tournament with ID:', id);
    fetch(`https://primechallenge.onrender.com/tournaments/`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch tournaments: ${res.status}`);
        }
        return res.json();
      })
      .then((data: Tournament[]) => {
        console.log('>>> [tournament] Tournaments fetched:', data);
        const foundTournament = data.find((t) => t.id === parseInt(id as string));
        if (foundTournament) {
          console.log('>>> [tournament] Found tournament:', foundTournament);
          setTournament(foundTournament); // Обновляем tournament, что вызовет useMatches
        } else {
          console.log('>>> [tournament] Tournament not found for ID:', id);
        }
      })
      .catch((err) => {
        console.error('>>> [tournament] Error loading tournament:', err);
      })
      .finally(() => {
        setIsLoadingTournament(false);
      });
  }, [id]);

  if (isLoadingTournament) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-center">Загрузка турнира...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-center">Турнир не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <Link href="/" className="text-cyan-400 hover:underline">
          ← Назад
        </Link>
        <h1 className="text-4xl font-bold mt-4">{tournament.name}</h1>
        <p className="text-gray-400 mt-2">{tournament.dates}</p>
        <span
          className={`mt-2 inline-block px-2 py-1 rounded text-sm ${
            tournament.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
          }`}
        >
          {tournament.status === 'ACTIVE' ? 'Активен' : 'Завершён'}
        </span>
      </header>

      <section className="grid gap-4">
        <h2 className="text-2xl font-semibold">Матчи</h2>
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : matches.length > 0 ? (
          matches.map((match) => (
            <div key={match.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
              <p className="text-lg font-medium">
                {match.player1} vs {match.player2}
              </p>
              <p className="text-gray-400">Раунд: {match.round}</p>
              {match.set1 && (
                <p className="text-gray-400">
                  Счёт: {match.set1} {match.set2 || ''} {match.set3 || ''} {match.set4 || ''}{' '}
                  {match.set5 || ''}
                </p>
              )}
              {match.winner && <p className="text-green-400">Победитель: {match.winner}</p>}
            </div>
          ))
        ) : (
          <p className="text-gray-400">Матчи загружаются...</p>
        )}
      </section>
    </div>
  );
}