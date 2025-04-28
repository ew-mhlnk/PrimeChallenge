'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useTournamentLogic } from '@/hooks/useTournamentLogic';
import styles from './BracketPage.module.css';

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
    <div className="min-h-screen bg-[#141414] text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-[375px]">
        <header>
          {/* 1. Кнопка "Назад" */}
          <Link href="/" className="text-[#5F6067] text-[16px]">
            ← Назад
          </Link>

          {/* 2. Название турнира */}
          <h1 className="mt-[40px] text-[14px] font-bold text-[#FFFFFF]">
            {tournament.name}
          </h1>
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

        {/* 4. Бенто баннер (заглушка), отцентрирован */}
        <div
          data-layer="Rectangle 541"
          className="Rectangle541 mt-[40px] mx-auto"
          style={{
            width: 'min(337px, 90vw)', // Адаптивная ширина
            height: 'min(124px, 33vw)', // Адаптивная высота
            background: '#D9D9D9',
            borderRadius: '29px',
          }}
        ></div>

        {/* 5. Кнопки с раундами */}
        <div className="overflow-x-auto mt-[40px] mb-4">
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

        {/* 7-11. Сетка с соединяющими линиями */}
        <section className="mt-[40px]">
          <AnimatePresence mode="wait">
            {selectedRound ? (
              <motion.div
                key={selectedRound}
                initial={{ x: 100 }}
                animate={{ x: 0 }}
                exit={{ x: -100 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-[320px]"
                {...dragHandlers}
              >
                {picks.length === 0 ? (
                  <p className="text-red-400">Матчи не найдены для раунда {selectedRound}</p>
                ) : (
                  <div className="flex flex-col gap-[40px]">
                    {picks
                      .filter((pick) => pick.round === selectedRound)
                      .map((pick) => {
                        const comparisonResult = comparison.find(
                          (c) => c.round === pick.round && c.match_number === pick.match_number
                        );
                        const displayPlayer1 = pick.player1 === "Q" || pick.player1 === "LL" ? pick.player1 : pick.player1 || 'TBD';
                        const displayPlayer2 = pick.player2 === "Q" || pick.player2 === "LL" ? pick.player2 : pick.player2 || 'TBD';

                        const isPlayer1Selected = pick.predicted_winner === pick.player1;
                        const isPlayer2Selected = pick.predicted_winner === pick.player2;

                        // Проверяем, кто фактический победитель
                        const isPlayer1Winner = comparisonResult?.actual_winner === pick.player1;
                        const isPlayer2Winner = comparisonResult?.actual_winner === pick.player2;

                        // Определяем стили ячеек
                        const getCellStyle = (isSelected: boolean, isCorrect: boolean | null, isWinner: boolean) => {
                          let background = 'linear-gradient(90deg, #161616 0%, #161616 100%)';
                          let border = '1px solid rgba(255, 255, 255, 0.18)';
                          let color = '#5F6067';
                          let textDecoration = 'none';

                          if (isSelected && !comparisonResult) {
                            // 8. Ячейка при нажатии (до сравнения)
                            background = 'linear-gradient(90deg, #102F51 0%, #102E51 100%)';
                            border = '1px solid rgba(0, 178, 255, 0.18)';
                            color = '#CBCBCB';
                          } else if (comparisonResult) {
                            if (isWinner) {
                              // 9. Правильная ячейка (фактический победитель)
                              background = 'linear-gradient(90deg, #1D1F1A 0%, #161616 100%)';
                              color = '#5B7E60';
                            } else {
                              // 10. Неправильная ячейка (не победитель)
                              background = 'linear-gradient(90deg, #201212 0%, #161616 100%)';
                              color = '#7E5B5B';
                              textDecoration = 'line-through';
                            }
                          }

                          return {
                            background,
                            border,
                            color,
                            textDecoration,
                          };
                        };

                        return (
                          <motion.div
                            key={`${pick.round}-${pick.match_number}`}
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`w-full max-w-[320px] ${styles.matchContainer}`}
                          >
                            <div className="flex flex-col gap-[12px]">
                              {/* Ячейка для первого игрока */}
                              <div className={styles.playerCell}>
                                <div
                                  data-layer="Rectangle 549"
                                  className="Rectangle549"
                                  style={getCellStyle(isPlayer1Selected, comparisonResult?.correct, isPlayer1Winner)}
                                  onClick={() => tournament.status === 'ACTIVE' && pick.player1 && handlePick(pick, pick.player1)}
                                >
                                  <div className="flex items-center">
                                    <p
                                      className="text-[14px]"
                                      style={{
                                        paddingLeft: '15px',
                                        lineHeight: '40px',
                                      }}
                                    >
                                      {displayPlayer1}
                                    </p>
                                    {/* 10. Правильная фамилия рядом, если игрок проиграл */}
                                    {comparisonResult && !isPlayer1Winner && (
                                      <p
                                        className="text-[14px] text-[#5F6067]"
                                        style={{
                                          marginLeft: '10px',
                                          lineHeight: '40px',
                                        }}
                                      >
                                        {comparisonResult.actual_winner}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Ячейка для второго игрока (если не финальный раунд "W") */}
                              {selectedRound !== "W" && (
                                <div className={styles.playerCell}>
                                  <div
                                    data-layer="Rectangle 550"
                                    className="Rectangle550"
                                    style={getCellStyle(isPlayer2Selected, comparisonResult?.correct, isPlayer2Winner)}
                                    onClick={() => tournament.status === 'ACTIVE' && pick.player2 && handlePick(pick, pick.player2)}
                                  >
                                    <div className="flex items-center">
                                      <p
                                        className="text-[14px]"
                                        style={{
                                          paddingLeft: '15px',
                                          lineHeight: '40px',
                                        }}
                                      >
                                        {displayPlayer2}
                                      </p>
                                      {/* 10. Правильная фамилия рядом, если игрок проиграл */}
                                      {comparisonResult && !isPlayer2Winner && (
                                        <p
                                          className="text-[14px] text-[#5F6067]"
                                          style={{
                                            marginLeft: '10px',
                                            lineHeight: '40px',
                                          }}
                                        >
                                          {comparisonResult.actual_winner}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Вертикальная соединяющая линия */}
                              {selectedRound !== "W" && (
                                <div className={styles.verticalLine} />
                              )}

                              {/* Ячейка для победителя (раунд "W") */}
                              {selectedRound === "W" && (
                                <div
                                  data-layer="Rectangle 549"
                                  className="Rectangle549"
                                  style={{
                                    width: '280px',
                                    height: '40px',
                                    background: 'linear-gradient(90deg, #1D1F1A 0%, #161616 100%)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255, 255, 255, 0.18)',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <p
                                    className="text-[14px] text-[#5B7E60]"
                                    style={{
                                      paddingLeft: '15px',
                                      lineHeight: '40px',
                                    }}
                                  >
                                    Победитель: {displayPlayer1}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </motion.div>
            ) : (
              <p className="text-red-400">Раунд не выбран</p>
            )}
          </AnimatePresence>
        </section>

        {/* 13-14. Кнопка "Сохранить" */}
        {tournament.status === 'ACTIVE' && (
          <div className="flex justify-center mt-4">
            <button
              onClick={savePicks}
              className="Rectangle532"
              style={{
                width: '135px',
                height: '32px',
                background: picks.some(pick => pick.predicted_winner)
                  ? '#0E325A'
                  : 'linear-gradient(90deg, #1B1A1F 0%, #161616 100%)',
                borderRadius: picks.some(pick => pick.predicted_winner) ? '25.5px' : '20px',
                border: picks.some(pick => pick.predicted_winner)
                  ? '1px solid #00B2FF'
                  : '1px solid rgba(255, 255, 255, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="text-[16px] text-[#CBCBCB]"
                style={{ lineHeight: '32px' }}
              >
                Сохранить сетку
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}