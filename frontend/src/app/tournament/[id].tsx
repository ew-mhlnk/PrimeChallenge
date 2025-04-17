'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tournament, Match } from '@/types';

// Указываем, что страница должна быть динамической
export const dynamic = 'force-dynamic';

export default function TournamentPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError('ID турнира не указан');
      setIsLoading(false);
      return;
    }

    const fetchTournamentAndMatches = async () => {
      try {
        setIsLoading(true);
        console.log('>>> [tournament] Fetching tournaments for ID:', id);

        // 1. Получаем все турниры
        const tournamentsRes = await fetch(`https://primechallenge.onrender.com/tournaments`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!tournamentsRes.ok) {
          throw new Error(`Ошибка при загрузке турниров: ${tournamentsRes.status}`);
        }
        const tournamentsData: Tournament[] = await tournamentsRes.json();
        console.log('>>> [tournament] Tournaments loaded:', tournamentsData);

        const found = tournamentsData.find((t) => t.id === parseInt(id as string));
        if (!found) {
          throw new Error(`Турнир с ID ${id} не найден`);
        }

        setTournament(found);
        console.log('>>> [tournament] Tournament set:', found);

        // 2. Загружаем матчи
        console.log('>>> [matches] Fetching matches for tournament ID:', found.id);
        const matchesRes = await fetch(`https://primechallenge.onrender.com/matches?tournament_id=${found.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!matchesRes.ok) {
          throw new Error(`Ошибка при загрузке матчей: ${matchesRes.status}`);
        }
        const matchesData: Match[] = await matchesRes.json();
        console.log('>>> [matches] Matches loaded:', matchesData);
        setMatches(matchesData);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('>>> Ошибка:', errorMessage);
        setError('Ошибка при загрузке данных. Попробуйте позже.');
      } finally {
        setIsLoading(false);
        console.log('>>> [fetch] Fetch completed, isLoading set to false');
      }
    };

    fetchTournamentAndMatches();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl">Загрузка...</p>
      </div>
    );
  }

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
        <p className="text-xl">Турнир не найден</p>
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