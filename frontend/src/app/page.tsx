'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import TournamentList from '@/components/TournamentList';
import MatchList from '@/components/MatchList';
import useAuth from '../hooks/useAuth';
import useTournaments from '../hooks/useTournaments';
import useMatches from '../hooks/useMatches';
import { Tournament } from '@/types';

export default function Home() {
  const { user, isLoading: isAuthLoading, error: authError } = useAuth();
  const { tournaments, error: tournamentsError } = useTournaments();
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const { matches, error: matchesError, loadMatches } = useMatches(selectedTournament);
  const [currentRound, setCurrentRound] = useState<string>('R64');

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    loadMatches(tournament);
    setCurrentRound('R64');
  };

  const error = authError || tournamentsError || matchesError;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-xl text-center">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <Header user={user} />
      {error && (
        <div className="mb-6 p-4 bg-red-500 text-white rounded-lg">
          {error}
        </div>
      )}
      {!selectedTournament ? (
        <TournamentList
          tournaments={tournaments}
          onTournamentSelect={handleTournamentSelect}
        />
      ) : (
        <MatchList
          tournament={selectedTournament}
          matches={matches}
          currentRound={currentRound}
          setCurrentRound={setCurrentRound}
          onBack={() => setSelectedTournament(null)}
        />
      )}
    </div>
  );
}