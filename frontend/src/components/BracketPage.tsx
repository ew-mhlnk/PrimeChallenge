'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MatchList from './MatchList';
import { useTournamentLogic } from '../hooks/useTournamentLogic';
import { UserPick } from '@/types';
import styles from './BracketPage.module.css';

const allRounds = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F', 'W'];

export default function BracketPage() {
  const { id } = useParams();
  const {
    tournament,
    picks,
    error,
    isLoading,
    comparison,
    selectedRound,
    setSelectedRound,
    rounds,
    handlePick: originalHandlePick,
    savePicks,
  } = useTournamentLogic({ id: typeof id === 'string' ? id : undefined, allRounds });

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (error) setNotification(error);
  }, [error]);

  console.log('BracketPage: tournament', tournament);
  console.log('BracketPage: picks', picks);
  console.log('BracketPage: rounds', rounds);
  console.log('BracketPage: selectedRound', selectedRound);

  if (isLoading) return <p className="text-[#FFFFFF] px-8">Загрузка...</p>;
  if (!tournament) return <p className="text-[#FFFFFF] px-8">Турнир не найден</p>;

  const canEdit = tournament.status === 'ACTIVE';
  console.log('BracketPage: canEdit', canEdit);

  const handlePick = (match: UserPick, player: string | null) => {
    if (!canEdit) {
      setNotification('Турнир закрыт, пики нельзя изменить');
      return;
    }

    originalHandlePick(match, player);

    if (player === null) {
      const newPicks = [...picks];
      const currentRoundIdx = allRounds.indexOf(match.round);

      for (let roundIdx = currentRoundIdx + 1; roundIdx < allRounds.length; roundIdx++) {
        const nextRound = allRounds[roundIdx];
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        const nextMatch = newPicks.find(
          (p) => p.round === nextRound && p.match_number === nextMatchNumber
        );

        if (nextMatch) {
          if (match.match_number % 2 === 1) {
            if (nextMatch.player1 === match.predicted_winner) {
              nextMatch.player1 = '';
              nextMatch.predicted_winner = null;
            }
          } else {
            if (nextMatch.player2 === match.predicted_winner) {
              nextMatch.player2 = '';
              nextMatch.predicted_winner = null;
            }
          }
        }

        if (nextRound === 'W') {
          const winnerMatch = newPicks.find((p) => p.round === 'W' && p.match_number === 1);
          if (winnerMatch) {
            winnerMatch.player1 = '';
            winnerMatch.predicted_winner = null;
          }
        }
      }
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      setNotification('Турнир закрыт, пики нельзя изменить');
      return;
    }
    await savePicks();
    setNotification('Пики сохранены!');
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white flex flex-col">
      <header className="flex justify-between items-start px-8 pt-8">
        <div>
          <h1 className="text-[25px] font-bold text-[#00B2FF] text-left leading-none">
            BRACKET CHALLENGE
          </h1>
          <p className="text-[12px] font-normal text-[#FFFFFF] text-left leading-none mt-0">
            BY ПРАЙМСПОРТ
          </p>
        </div>
        <Link href="/profile">
          <div data-svg-wrapper data-layer="Rectangle 533" className="Rectangle533">
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="48" height="48" rx="24" fill="url(#paint0_linear_1613_3)" fillOpacity="0.26" stroke="#00B3FF" strokeWidth="2"/>
              <defs>
                <linearGradient id="paint0_linear_1613_3" x1="0.570776" y1="50" x2="48.4078" y2="48.7622" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#008CFF"/>
                  <stop offset="1" stopColor="#0077FF"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </Link>
      </header>

      <div className="h-[50px]"></div>

      <main className="flex-1 px-8">
        {notification && (
          <div className="mb-4 p-2 bg-yellow-500 text-white rounded">
            {notification}
          </div>
        )}

        <h1 className="text-[20px] font-semibold text-[#FFFFFF] text-left mb-[15px]">
          {tournament.name}
        </h1>
        <p className="text-[#FFFFFF] text-[14px] mb-1">{tournament.dates}</p>
        <p className="text-[#FFFFFF] text-[14px] mb-4">Статус: {tournament.status}</p>

        <div className="flex space-x-2 mb-4 overflow-x-auto">
          {rounds && rounds.length > 0 ? (
            rounds.map((round: string) => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                className={`px-4 py-2 rounded ${
                  selectedRound === round ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
                }`}
              >
                {round}
              </button>
            ))
          ) : (
            <p className="text-[#FFFFFF]">Раунды не найдены</p>
          )}
        </div>

        {selectedRound ? (
          <MatchList
            picks={picks}
            round={selectedRound}
            comparison={comparison}
            handlePick={handlePick}
            canEdit={canEdit}
            styles={styles}
          />
        ) : (
          <p className="text-[#FFFFFF]">Выберите раунд</p>
        )}

        {canEdit && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleSave}
              className="Rectangle532 w-[176px] h-10 p-2.5 rounded-[20px] border border-[#D6D6D6] flex justify-center items-center gap-2.5"
            >
              <span className="text-[#D6D6D6] text-base font-bold leading-[19.2px]">
                Сохранить сетку
              </span>
            </button>
          </div>
        )}
      </main>

      <div className="h-[19px]"></div>
    </div>
  );
}