import { samePlayer } from '../shared/helpers';
import { SlotState } from './BracketBoard';

export const slotState = (
  player: string | null,
  picked: string | null,
  winner: string | null,
): SlotState => {
  if (!player) return '';
  const isPicked = samePlayer(player, picked);
  const isWinner = samePlayer(player, winner);
  if (!winner) return isPicked ? 'picked' : '';
  if (isPicked) return isWinner ? 'correct' : 'wrong';
  return isWinner ? 'advanced' : '';
};
