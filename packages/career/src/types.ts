import type { DevelopmentState } from '@pavilion/world';

export type MatchOutcome = 'W' | 'L' | 'D' | 'T';

export type ObjectiveKind = 'win-matches' | 'win-series' | 'develop-youth';

export interface Objective {
  id: string;
  kind: ObjectiveKind;
  description: string;
  target: number;
  progress: number;
  deadline: string;
  met: boolean;
  failed: boolean;
}

export interface CoachCareer {
  id: string;
  name: string;
  teamId: string;
  reputation: number;
  boardConfidence: number;
  objectives: Objective[];
  seasons: number;
}

export interface JobOffer {
  teamId: string;
  teamName: string;
  reputationRequired: number;
  salary: number;
}

export interface PlayerCareer {
  playerId: string;
  name: string;
  teamId: string;
  development: DevelopmentState;
  matches: number;
  runs: number;
  wickets: number;
  fifties: number;
  hundreds: number;
  fiveWicketHauls: number;
  retired: boolean;
}
