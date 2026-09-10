import type { DismissalKind, ExtraKind } from './types';

export type BallHighlight = 'wicket' | 'four' | 'six' | null;

export interface BallEvent {
  /** 0-based innings index. */
  inningsIndex: number;
  battingTeamId: string;
  bowlingTeamId: string;
  /** 0-based over number. */
  over: number;
  /** Ball within the over (wide/no-balls repeat the upcoming ball number). */
  ballInOver: number;
  batterId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  extraKind: ExtraKind | null;
  wicketKind: DismissalKind | null;
  totalRuns: number;
  /** Team score after the delivery. */
  score: number;
  wickets: number;
  /** Batter's own score after the delivery. */
  batterRuns: number;
  highlight: BallHighlight;
}

export function ballLabel(event: BallEvent): string {
  if (event.extraKind === 'wide') return 'wd';
  if (event.extraKind === 'noball') return 'nb';
  if (event.wicketKind !== null) return 'W';
  return String(event.runsOffBat);
}
