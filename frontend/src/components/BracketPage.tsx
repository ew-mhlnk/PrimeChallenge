'use client';

import { useTournamentLogic } from '../hooks/useTournamentLogic';

export default function Bracket({ id }: { id: string }) {
  const {
    tournament,
    bracket,
    hasPicks,
    error,
    isLoading,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick,
    savePicks,
  } = useTournamentLogic({ id });

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!tournament) return <p>Турнир не найден</p>;

  const handlePlayerClick = (round: string, matchNumber: number, player: string) => {
    handlePick(round, matchNumber, player);
  };

  return (
    <div>
      <h2>{tournament.name}</h2>
      <select value={selectedRound || ''} onChange={(e) => setSelectedRound(e.target.value || null)}>
        {rounds.map((round) => (
          <option key={round} value={round}>
            {round}
          </option>
        ))}
      </select>
      {selectedRound && bracket[selectedRound] && (
        <div>
          {Object.entries(bracket[selectedRound]).map(([matchNum, match]) => (
            <div key={matchNum}>
              <p>
                {match.player1} vs {match.player2}
              </p>
              <button
                onClick={() => handlePlayerClick(selectedRound, parseInt(matchNum), match.player1 || '')}
                disabled={tournament.status !== 'ACTIVE'}
              >
                Выбрать {match.player1}
              </button>
              <button
                onClick={() => handlePlayerClick(selectedRound, parseInt(matchNum), match.player2 || '')}
                disabled={tournament.status !== 'ACTIVE'}
              >
                Выбрать {match.player2}
              </button>
              {match.predicted_winner && <p>Выбор: {match.predicted_winner}</p>}
            </div>
          ))}
        </div>
      )}
      {tournament.status === 'ACTIVE' && (
        <button onClick={savePicks} disabled={!hasPicks}>
          Сохранить пики
        </button>
      )}
    </div>
  );
}