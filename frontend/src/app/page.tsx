'use client';

import TournamentList from '../components/TournamentList';
import Leaderboard from '../components/Leaderboard';
import useTournaments from '../hooks/useTournaments';

export default function Home() {
  const { tournaments, error } = useTournaments();

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Prime Bracket Challenge</h1>

      {/* Активные и закрытые турниры */}
      <h2 className="text-2xl font-semibold mb-4">Текущие турниры</h2>
      <TournamentList filterStatus="ACTIVE" />
      <TournamentList filterStatus="CLOSED" />

      {/* Лидерборд */}
      <Leaderboard tournaments={tournaments} />

      {/* Архив */}
      <h2 className="text-2xl font-semibold mt-6 mb-4">Архив</h2>
      <TournamentList filterStatus="COMPLETED" />
    </div>
  );
}