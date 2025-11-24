'use client';

import { useTournamentContext } from '@/context/TournamentContext';

export default function useTournaments() {
  // Теперь мы не делаем fetch здесь.
  // Мы просто берем данные из глобального хранилища.
  // Это решает проблему "моргания".
  return useTournamentContext();
}