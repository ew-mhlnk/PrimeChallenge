export interface User {
  id: number;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
}

export interface Match {
  id: number;
  tournament_id: number;
  round: string;
  match_number: number;
  player1: string | null;
  player2: string | null;
  winner: string | null;
  set1: string | null;
  set2: string | null;
  set3: string | null;
  set4: string | null;
  set5: string | null;
}

export interface Tournament {
  id: number;
  name: string;
  dates: string;
  status: 'ACTIVE' | 'CLOSED';
  starting_round: string;
}