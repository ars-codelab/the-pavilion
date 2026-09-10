import type { CricsheetMatch } from './cricsheet';

export interface CalibrationSummary {
  matches: number;
  innings: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  fours: number;
  sixes: number;
  runsPerInnings: number;
  wicketsPerInnings: number;
  runsPerOver: number;
}

export function summariseMatches(matches: readonly CricsheetMatch[]): CalibrationSummary {
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let fours = 0;
  let sixes = 0;
  let innings = 0;

  for (const match of matches) {
    for (const entry of match.innings) {
      innings += 1;
      runs += entry.runs;
      wickets += entry.wickets;
      legalBalls += entry.legalBalls;
      fours += entry.fours;
      sixes += entry.sixes;
    }
  }

  const inningsCount = innings === 0 ? 1 : innings;
  const overs = legalBalls / 6;

  return {
    matches: matches.length,
    innings,
    runs,
    wickets,
    legalBalls,
    fours,
    sixes,
    runsPerInnings: runs / inningsCount,
    wicketsPerInnings: wickets / inningsCount,
    runsPerOver: overs === 0 ? 0 : runs / overs,
  };
}
