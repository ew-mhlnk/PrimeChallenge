export type FinalsStageState = 'waiting' | 'open' | 'closed' | 'finished';

export interface FinalsStage {
  state: FinalsStageState;
  opens_at: string | null;
  closes_at: string | null;
}

export interface FinalsGroupRow {
  cells: string[];
  wl: string;
}

export interface FinalsGroup {
  stage: 'GROUP_A' | 'GROUP_B';
  title: string;
  players: string[];
  columns: string[];
  rows: FinalsGroupRow[];
  winners: string[];
  picks: string[];
  points: number;
}

export interface FinalsPlayoff {
  pairs: string[][];
  finalists: string[];
  champion: string | null;
  picked_finalists: string[];
  picked_champion: string | null;
  finalist_points: number;
  champion_points: number;
}

export interface FinalsData {
  id: number;
  name: string;
  dates?: string;
  tag?: string;
  image_url?: string;
  score: number;
  correct_picks: number;
  scoring: { GROUP: number; SF: number; F: number };
  group_stage: FinalsStage;
  playoff_stage: FinalsStage;
  groups: FinalsGroup[];
  playoff: FinalsPlayoff;
}

export type FinalsSavePayload =
  | { phase: 'groups'; group_a: string[]; group_b: string[] }
  | { phase: 'playoff'; finalists: string[]; champion: string };
