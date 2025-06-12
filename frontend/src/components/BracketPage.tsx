// frontend/src/components/BracketPage.tsx
'use client';

import { useTournamentLogic } from '../hooks/useTournamentLogic';
import MatchList from './MatchList';

export default function BracketPage({ id }: { id: string }) {
  const {
    tournament,
    bracket,
    hasPicks,
    error,
    isLoading,
    selectedRound,
    setSelectedRound,
    rounds,
    comparison,
    handlePick,
    savePicks,
  } = useTournamentLogic({ id });

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!tournament) return <p>Турнир не найден</p>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">{tournament.name}</h2>
      <div className="mb-4">
        <label className="mr-2">Раунд:</label>
        <select
          value={selectedRound || ''}
          onChange={(e) => setSelectedRound(e.target.value || null)}
          className="select select-bordered rounded-lg"
        >
          <option value="" disabled>
            Выберите раунд
          </option>
          {rounds.map((round) => (
            <option key={round} value={round}>
              {round}
            </option>
          ))}
        </select>
      </div>
      {selectedRound && bracket[selectedRound] && (
        <MatchList
          round={selectedRound}
          matches={bracket[selectedRound]}
          tournamentStatus={tournament.status}
          comparison={comparison}
          onPlayerClick={handlePick}
        />
      )}
      {tournament.status === TournamentStatus.ACTIVE && (
        <button
          onClick={savePicks}
          disabled={!hasPicks}
          className="btn btn-primary mt-4 rounded-lg"
        >
          Сохранить пики
        </button>
      )}
    </div>
  );
}