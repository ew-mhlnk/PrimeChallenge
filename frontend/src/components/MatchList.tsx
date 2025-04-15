'use client';

import { useState } from 'react';
import { Tournament, Match } from '@/types';

interface MatchListProps {
  tournament: Tournament;
  matches: Match[];
  currentRound: string;
  setCurrentRound: (round: string) => void;
  onBack: () => void;
}

export default function MatchList({ tournament, matches, currentRound, setCurrentRound, onBack }: MatchListProps) {
  const [picks, setPicks] = useState<{ [matchId: number]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rounds = Array.from(new Set(matches.map((match) => match.round))).sort((a, b) => {
    const roundOrder = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];
    return roundOrder.indexOf(a) - roundOrder.indexOf(b);
  });

  const currentRoundMatches = matches.filter((match) => match.round === currentRound);

  const handlePick = (matchId: number, player: string) => {
    setPicks((prev) => ({
      ...prev,
      [matchId]: player,
    }));
  };

  const handleSubmitPicks = async () => {
    setIsSubmitting(true);
    const picksToSubmit = Object.entries(picks).map(([matchId, predicted_winner]) => ({
      match_id: parseInt(matchId),
      predicted_winner,
    }));

    try {
      const response = await fetch('https://primechallenge.onrender.com/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: window.Telegram?.WebApp?.initData,
          picks: picksToSubmit,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to submit picks');
      }
      alert('Пики успешно сохранены!');
    } catch (error) {
      console.error('Ошибка при сохранении пиков:', error);
      alert('Ошибка при сохранении пиков. Попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreDisplay = (match: Match) => {
    const sets = [match.set1, match.set2, match.set3, match.set4, match.set5].filter(Boolean);
    return sets.length > 0 ? sets.join(', ') : 'Нет счёта';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-blue-400 hover:underline">
          Назад к турнирам
        </button>
        <h2 className="text-2xl font-bold">{tournament.name}</h2>
        <div>
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => setCurrentRound(round)}
              className={`px-3 py-1 mx-1 rounded ${currentRound === round ? 'bg-blue-500' : 'bg-gray-700'}`}
            >
              {round}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {currentRoundMatches.map((match) => (
          <div key={match.id} className="p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400">Матч #{match.match_number}</p>
            <div className="flex justify-between items-center">
              <div>
                <p>{match.player1}</p>
                <p>{match.player2}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Счёт: {getScoreDisplay(match)}</p>
                {match.winner && <p className="text-green-400">Победитель: {match.winner}</p>}
              </div>
            </div>
            {!match.winner && (
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => handlePick(match.id, match.player1)}
                  className={`px-3 py-1 rounded ${picks[match.id] === match.player1 ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  {match.player1}
                </button>
                <button
                  onClick={() => handlePick(match.id, match.player2)}
                  className={`px-3 py-1 rounded ${picks[match.id] === match.player2 ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  {match.player2}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {currentRoundMatches.some((match) => !match.winner) && (
        <div className="mt-6">
          <button
            onClick={handleSubmitPicks}
            disabled={isSubmitting || Object.keys(picks).length === 0}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isSubmitting ? 'Сохранение...' : 'Сохранить пики'}
          </button>
        </div>
      )}
    </div>
  );
}