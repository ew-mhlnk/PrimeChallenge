'use client';

import TournamentList from '@/components/TournamentList';

export default function Archive() {
  return (
    <div className="container mx-auto p-4 text-white">
      <h1 className="text-3xl font-bold mb-6">Архив турниров</h1>
      <TournamentList filterStatus="COMPLETED" />
    </div>
  );
}