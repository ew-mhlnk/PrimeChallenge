'use client';

import { useTournamentContext } from '@/context/TournamentContext';

export default function useTournaments() {
  return useTournamentContext();
}