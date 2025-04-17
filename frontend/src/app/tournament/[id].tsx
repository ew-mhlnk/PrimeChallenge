'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tournament, Match } from '@/types';

export default function TournamentPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchTournamentAndMatches = async () => {
      try {
        // 1. Получаем все турниры
        const tournamentsRes = await fetch(`https://primechallenge.onrender.com/tournaments`);
        if (!tournamentsRes.ok) throw new Error('Ошибка при загрузке турниров');
        const tournamentsData: Tournament[] = await tournamentsRes.json();

        const found = tournamentsData.find((t) => t.id === parseInt(id as string));
        if (!found) {
          setError('Турнир не найден');
          return;
        }

        setTournament(found);

        // 2. Загружаем матчи (исправленный эндпоинт)
        const matchesRes = await fetch(`https://primechallenge.onrender.com/matches?tournament_id=${found.id}`);
        if (!matchesRes.ok) throw new Error('Ошибка при загрузке матчей');
        const matchesData: Match[] = await matchesRes.json();
        setMatches(matchesData);
      } catch (err) {
        console.error('>>> Ошибка:', err);
        setError('Ошибка при загрузке данных. Попробуйте позже.');
      }
    };

    fetchTournamentAndMatches();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-red-400">{error}</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Загрузка...</p>
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
        <h2 className="text-2xl font-semibold mb-4">Матчи</h2>
        {matches.length === 0 ? (
          <p className="text-gray-400">Матчи не найдены</p>
        ) : (
          matches.map((match) => (
            <div key={match.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
              <p className="text-lg font-medium">
                {match.player1} vs {match.player2}
              </p>
              <p className="text-gray-400">Раунд: {match.round}</p>
              {match.set1 && (
                <p className="text-gray-400">
                  Счёт: {match.set1} {match.set2 || ''} {match.set3 || ''} {match.set4 || ''} {match.set5 || ''}
                </p>
              )}
              {match.winner && <p className="text-green-400">Победитель: {match.winner}</p>}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
