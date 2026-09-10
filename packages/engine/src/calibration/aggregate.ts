import type { CricsheetMatch } from './cricsheet';

export interface CalibrationSummary {
  matches: number;
  innings: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  deliveries: number;
  dotBalls: number;
  fours: number;
  sixes: number;
  runsPerInnings: number;
  wicketsPerInnings: number;
  runsPerOver: number;
  runsPerWicket: number;
  ballsPerWicket: number;
  dotRate: number;
  boundaryRate: number;
}

export function summariseMatches(matches: readonly CricsheetMatch[]): CalibrationSummary {
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let deliveries = 0;
  let dotBalls = 0;
  let fours = 0;
  let sixes = 0;
  let innings = 0;

  for (const match of matches) {
    for (const entry of match.innings) {
      innings += 1;
      runs += entry.runs;
      wickets += entry.wickets;
      legalBalls += entry.legalBalls;
      deliveries += entry.deliveries;
      dotBalls += entry.dotBalls;
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
    deliveries,
    dotBalls,
    fours,
    sixes,
    runsPerInnings: runs / inningsCount,
    wicketsPerInnings: wickets / inningsCount,
    runsPerOver: overs === 0 ? 0 : runs / overs,
    runsPerWicket: runs / (wickets === 0 ? 1 : wickets),
    ballsPerWicket: legalBalls / (wickets === 0 ? 1 : wickets),
    dotRate: legalBalls === 0 ? 0 : dotBalls / legalBalls,
    boundaryRate: legalBalls === 0 ? 0 : (fours + sixes) / legalBalls,
  };
}
