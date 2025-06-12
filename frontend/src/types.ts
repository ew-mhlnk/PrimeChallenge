// frontend/src/types.ts
export enum TournamentStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED',
}

export interface User {
  user_id: number; // Соответствует UserBase.user_id в schemas.py
  first_name: string; // first_name
  last_name?: string | null; // last_name, nullable
  username?: string | null; // username, nullable
}

export interface Tournament {
  id: number; // tournaments.id
  name: string; // tournaments.name
  dates?: string; // tournaments.dates
  status: TournamentStatus; // tournaments.status (enum)
  sheet_name?: string; // tournaments.sheet_name
  starting_round?: string; // tournaments.starting_round (e.g., "R32")
  type?: string; // tournaments.type
  start?: string; // tournaments.start
  close?: string; // tournaments.close
  tag?: string; // tournaments.tag
  true_draws?: Match[]; // tournaments.true_draws (relation)
  user_picks?: UserPick[]; // tournaments.user_picks (relation)
  rounds?: string[]; // from bracket.generate_bracket_and_comparison
  bracket?: { [round: string]: { [matchNumber: string]: BracketMatch } }; // Строковые индексы
  has_picks?: boolean; // API response: len(user_picks) > 0
  comparison?: Comparison[]; // from bracket.py for CLOSED/COMPLETED
  score?: number; // from API (user's total score)
  correct_picks?: number; // from API (user's correct picks)
}

export interface Match {
  id: number; // true_draw.id
  tournament_id: number; // true_draw.tournament_id
  round: string; // true_draw.round
  match_number: number; // true_draw.match_number
  player1: string | null; // true_draw.player1
  player2: string | null; // true_draw.player2
  set1?: string | null; // true_draw.set1
  set2?: string | null; // true_draw.set2
  set3?: string | null; // true_draw.set3
  set4?: string | null; // true_draw.set4
  set5?: string | null; // true_draw.set5
  winner?: string | null; // true_draw.winner
}

export interface BracketMatch {
  player1: string | null; // from true_draw.player1 or "TBD"
  player2: string | null; // from true_draw.player2 or "TBD"
  predicted_winner?: string | null; // from user_picks.predicted_winner
}

export interface UserPick {
  id: number; // user_picks.id
  user_id: number; // user_picks.user_id
  tournament_id: number; // user_picks.tournament_id
  round: string; // user_picks.round
  match_number: number; // user_picks.match_number
  player1: string | null; // user_picks.player1
  player2: string | null; // user_picks.player2
  predicted_winner?: string | null; // user_picks.predicted_winner
  created_at?: string; // user_picks.created_at
  updated_at?: string; // user_picks.updated_at
  user?: User; // relation to User
  tournament?: Tournament; // relation to Tournament
}

export interface UserScore {
  id: number; // user_scores.id
  user_id: number; // user_scores.user_id
  tournament_id: number; // user_scores.tournament_id
  score: number; // user_scores.score
  correct_picks: number; // user_scores.correct_picks
  updated_at?: string; // user_scores.updated_at
  user?: User; // relation to User
  tournament?: Tournament; // relation to Tournament
}

export interface Comparison {
  round: string; // comparison.round
  match_number: number; // comparison.match_number
  player1: string; // comparison.player1
  player2: string; // comparison.player2
  predicted_winner?: string | null; // comparison.predicted_winner
  actual_winner?: string | null; // comparison.actual_winner
  correct?: boolean; // comparison.correct
}

export interface LeaderboardEntry {
  id: number; // leaderboard.id
  tournament_id: number; // leaderboard.tournament_id
  user_id: number; // leaderboard.user_id
  rank: number; // leaderboard.rank
  score: number; // leaderboard.score
  correct_picks: number; // leaderboard.correct_picks
  updated_at?: string; // leaderboard.updated_at
}