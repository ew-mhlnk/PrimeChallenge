'use client';

import Leaderboard from '../../components/Leaderboard';
import useTournaments from '../../hooks/useTournaments';

export default function LeaderboardPage() {
  const { tournaments, error } = useTournaments();

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Лидерборд</h1>
      <Leaderboard tournaments={tournaments} />
    </div>
  );
}