import type { Attributes } from '@pavilion/world';
import { applyAppearance, developYear, isRetired } from '@pavilion/world';
import type { PlayerCareer } from './types';

export interface AppearanceInput {
  runs: number;
  wickets: number;
  won: boolean;
  workload: number;
  /** 0-100 overall performance rating for form. */
  performance: number;
}

export function createPlayerCareer(
  playerId: string,
  name: string,
  teamId: string,
  potential: Attributes,
  age: number,
  peakAge = 28,
): PlayerCareer {
  return {
    playerId,
    name,
    teamId,
    development: {
      age,
      peakAge,
      potential,
      ability: {
        batting: Math.round(potential.batting * 0.55),
        bowling: Math.round(potential.bowling * 0.55),
        fielding: Math.round(potential.fielding * 0.55),
      },
      form: 50,
      morale: 60,
      fitness: 100,
      experience: 0,
    },
    matches: 0,
    runs: 0,
    wickets: 0,
    fifties: 0,
    hundreds: 0,
    fiveWicketHauls: 0,
    retired: false,
  };
}

export function recordAppearance(career: PlayerCareer, input: AppearanceInput): PlayerCareer {
  const development = applyAppearance(
    career.development,
    input.performance,
    input.workload,
    input.won,
  );
  return {
    ...career,
    development,
    matches: career.matches + 1,
    runs: career.runs + input.runs,
    wickets: career.wickets + input.wickets,
    fifties: career.fifties + (input.runs >= 50 && input.runs < 100 ? 1 : 0),
    hundreds: career.hundreds + (input.runs >= 100 ? 1 : 0),
    fiveWicketHauls: career.fiveWicketHauls + (input.wickets >= 5 ? 1 : 0),
  };
}

export function advanceYear(career: PlayerCareer): PlayerCareer {
  const development = developYear(career.development);
  return { ...career, development, retired: isRetired(development) };
}

export function battingAverage(career: PlayerCareer): number {
  return career.matches === 0 ? 0 : career.runs / career.matches;
}

export function bowlingAverage(career: PlayerCareer): number {
  return career.wickets === 0 ? Number.POSITIVE_INFINITY : career.runs / career.wickets;
}
