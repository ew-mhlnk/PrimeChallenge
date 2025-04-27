'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useTournamentLogic } from '@/hooks/useTournamentLogic';

const allRounds = ["R128", "R64", "R32", "R16", "QF", "SF", "F"];

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
    handlePick,
    savePicks,
  } = useTournamentLogic({ id: id as string, allRounds });

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!selectedRound || !rounds.length) return;
    const currentIndex = rounds.indexOf(selectedRound);
    if (direction === 'left' && currentIndex < rounds.length - 1) {
      setSelectedRound(rounds[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setSelectedRound(rounds[currentIndex - 1]);
    }
  };

  const dragHandlers = {
    drag: "x" as const,
    dragConstraints: { left: 0, right: 0 },
    dragElastic: 0.2,
    onDragEnd: (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      if (offset > 50) handleSwipe('right');
      else if (offset < -50) handleSwipe('left');
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <p className="text-xl">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <p className="text-xl text-red-400">{error}</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <p className="text-xl">Турнир не найден</p>
      </div>
    );
  }

  const championMatch = comparison.find((c) => c.round === "F" && c.match_number === 1);
  const champion = championMatch?.actual_winner;

  return (
    <div className="min-h-screen bg-[#141414] text-white p-4">
      <header className="mb-4">
        <Link href="/" className="text-cyan-400 hover:underline">
          ← Назад
        </Link>
        <h1 className="text-3xl font-bold mt-2">{tournament.name}</h1>
        <p className="text-gray-400 mt-1">{tournament.dates}</p>
        <span
          className={`mt-2 inline-block px-2 py-1 rounded text-sm ${
            tournament.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
          }`}
        >
          {tournament.status === 'ACTIVE' ? 'Активен' : 'Завершён'}
        </span>
        {champion && <p className="text-green-400 mt-2">Победитель: {champion}</p>}
      </header>

      <div className="overflow-x-auto mb-4">
        <div className="flex gap-2 whitespace-nowrap">
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => setSelectedRound(round)}
              className={`w-[53px] h-9 rounded-[25.5px] text-sm font-medium flex items-center justify-center ${
                selectedRound === round
                  ? 'bg-gradient-to-r from-[rgba(0,140,255,0.26)] to-[rgba(0,119,255,0.26)] border-2 border-[#00B2FF] text-[#CBCBCB]'
                  : 'text-[#5F6067]'
              }`}
            >
              {round}
            </button>
          ))}
        </div>
      </div>

      <section>
        <AnimatePresence mode="wait">
          {selectedRound && (
            <motion.div
              key={selectedRound}
              initial={{ x: 100 }}
              animate={{ x: 0 }}
              exit={{ x: -100 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-[320px]"
              {...dragHandlers}
            >
              <div className="flex flex-col gap-2">
                {picks
                  .filter((pick) => pick.round === selectedRound)
                  .map((pick) => {
                    const comparisonResult = comparison.find(
                      (c) => c.round === pick.round && c.match_number === pick.match_number
                    );
                    const displayPlayer1 = pick.player1 === "Q" || pick.player1 === "LL" ? pick.player1 : pick.player1 || 'TBD';
                    const displayPlayer2 = pick.player2 === "Q" || pick.player2 === "LL" ? pick.player2 : pick.player2 || 'TBD';

                    return (
                      <motion.div
                        key={`${pick.round}-${pick.match_number}`}
                        initial={{ y: 20 }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full max-w-[320px] p-4 rounded-lg"
                      >
                        <div className="flex flex-col gap-2">
                          <div
                            style={{
                              position: 'relative',
                              background: 'linear-gradient(180deg, #1B1A1F 0%, #161616 100%)',
                              borderRadius: '12px',
                              padding: '12px',
                              color: 'white',
                              zIndex: 1,
                            }}
                            onClick={() => tournament.status === 'ACTIVE' && pick.player1 && handlePick(pick, pick.player1)}
                          >
                            <div
                              style={{
                                content: '""',
                                position: 'absolute',
                                inset: 0,
                                padding: '1px',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(153,153,153,0) 100%)',
                                borderRadius: 'inherit',
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                zIndex: -1,
                                pointerEvents: 'none',
                              }}
                            />
                            <p
                              className={`text-base font-medium cursor-pointer ${
                                pick.predicted_winner === pick.player1 ? 'text-green-400' : ''
                              } ${tournament.status === 'ACTIVE' ? 'hover:underline' : ''}`}
                            >
                              {displayPlayer1}
                            </p>
                          </div>
                          {selectedRound !== "W" && (
                            <div
                              style={{
                                position: 'relative',
                                background: 'linear-gradient(180deg, #1B1A1F 0%, #161616 100%)',
                                borderRadius: '12px',
                                padding: '12px',
                                color: 'white',
                                zIndex: 1,
                              }}
                              onClick={() => tournament.status === 'ACTIVE' && pick.player2 && handlePick(pick, pick.player2)}
                            >
                              <div
                                style={{
                                  content: '""',
                                  position: 'absolute',
                                  inset: 0,
                                  padding: '1px',
                                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(153,153,153,0) 100%)',
                                  borderRadius: 'inherit',
                                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                  WebkitMaskComposite: 'xor',
                                  maskComposite: 'exclude',
                                  zIndex: -1,
                                  pointerEvents: 'none',
                                }}
                              />
                              <p
                                className={`text-base font-medium cursor-pointer ${
                                  pick.predicted_winner === pick.player2 ? 'text-green-400' : ''
                                } ${tournament.status === 'ACTIVE' ? 'hover:underline' : ''}`}
                              >
                                {displayPlayer2}
                              </p>
                            </div>
                          )}
                          {selectedRound === "W" && (
                            <div
                              style={{
                                position: 'relative',
                                background: 'linear-gradient(180deg, #1B1A1F 0%, #161616 100%)',
                                borderRadius: '12px',
                                padding: '12px',
                                color: 'white',
                                zIndex: 1,
                              }}
                            >
                              <div
                                style={{
                                  content: '""',
                                  position: 'absolute',
                                  inset: 0,
                                  padding: '1px',
                                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(153,153,153,0) 100%)',
                                  borderRadius: 'inherit',
                                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                  WebkitMaskComposite: 'xor',
                                  maskComposite: 'exclude',
                                  zIndex: -1,
                                  pointerEvents: 'none',
                                }}
                              />
                              <p className="text-base font-medium text-green-400">
                                Победитель: {displayPlayer1}
                              </p>
                            </div>
                          )}
                          {selectedRound !== "W" && comparisonResult && (
                            <div className="text-sm mt-2">
                              <p className="text-gray-400">Прогноз: {comparisonResult.predicted_winner}</p>
                              <p className="text-gray-400">Факт: {comparisonResult.actual_winner}</p>
                              <p className={comparisonResult.correct ? 'text-green-400' : 'text-red-400'}>
                                {comparisonResult.correct ? 'Правильно' : 'Неправильно'}
                              </p>
                            </div>
                          )}
                          {selectedRound !== "W" && pick.winner && (
                            <div className="text-sm mt-2">
                              <p className="text-gray-400">W: {pick.winner}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {tournament.status === 'ACTIVE' && (
        <div className="flex justify-center">
          <button
            onClick={savePicks}
            className="mt-4 w-full max-w-[320px] h-9 bg-gradient-to-r from-[rgba(0,140,255,0.26)] to-[rgba(0,119,255,0.26)] border-2 border-[#00B2FF] text-[#CBCBCB] rounded-[25.5px] text-sm font-medium"
          >
            Сохранить сетку
          </button>
        </div>
      )}
    </div>
  );
}