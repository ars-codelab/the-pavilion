import type { Random } from './rng';
import { simulateMatch } from './match-sim';
import type { MatchConditions } from './conditions';
import type { MatchResult, Team } from './match-sim';
import type { FormatId, FormatSpec } from './types';

export interface SeriesOptions {
  spec: FormatSpec;
  home: Team;
  away: Team;
  matches: number;
  conditionsForMatch?: (index: number) => MatchConditions;
}

export interface SeriesResult {
  format: FormatId;
  home: Team;
  away: Team;
  matches: MatchResult[];
  homeWins: number;
  awayWins: number;
  draws: number;
  ties: number;
  winnerTeamId: string | null;
  summary: string;
}

export function simulateSeries(random: Random, options: SeriesOptions): SeriesResult {
  const matches: MatchResult[] = [];
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let ties = 0;

  for (let index = 0; index < options.matches; index += 1) {
    const conditions = options.conditionsForMatch?.(index);
    const result = simulateMatch(random, {
      spec: options.spec,
      home: options.home,
      away: options.away,
      conditions,
    });
    matches.push(result);
    if (result.drawn) draws += 1;
    else if (result.tied) ties += 1;
    else if (result.winnerTeamId === options.home.id) homeWins += 1;
    else if (result.winnerTeamId === options.away.id) awayWins += 1;
  }

  let winnerTeamId: string | null = null;
  if (homeWins > awayWins) winnerTeamId = options.home.id;
  else if (awayWins > homeWins) winnerTeamId = options.away.id;

  const leader =
    winnerTeamId === options.home.id
      ? options.home
      : winnerTeamId === options.away.id
        ? options.away
        : null;
  let summary: string;
  if (leader === null) {
    summary = `Series drawn ${homeWins}-${awayWins}`;
    if (draws > 0 || ties > 0) summary += ` (${draws} drawn, ${ties} tied)`;
  } else {
    const high = Math.max(homeWins, awayWins);
    const low = Math.min(homeWins, awayWins);
    summary = `${leader.name} won the series ${high}-${low}`;
  }

  return {
    format: options.spec.id,
    home: options.home,
    away: options.away,
    matches,
    homeWins,
    awayWins,
    draws,
    ties,
    winnerTeamId,
    summary,
  };
}

export interface PlayerSeriesStats {
  playerId: string;
  teamId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  wickets: number;
  legalBalls: number;
  runsConceded: number;
}

export function seriesPlayerStats(result: SeriesResult): PlayerSeriesStats[] {
  const stats = new Map<string, PlayerSeriesStats>();

  const ensure = (playerId: string, teamId: string): PlayerSeriesStats => {
    const existing = stats.get(playerId);
    if (existing !== undefined) return existing;
    const created: PlayerSeriesStats = {
      playerId,
      teamId,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      wickets: 0,
      legalBalls: 0,
      runsConceded: 0,
    };
    stats.set(playerId, created);
    return created;
  };

  for (const match of result.matches) {
    for (const innings of match.innings) {
      for (const batter of innings.state.battingCard) {
        const entry = ensure(batter.playerId, innings.battingTeamId);
        entry.runs += batter.runs;
        entry.balls += batter.balls;
        entry.fours += batter.fours;
        entry.sixes += batter.sixes;
      }
      for (const bowler of innings.bowlers) {
        const entry = ensure(bowler.playerId, innings.bowlingTeamId);
        entry.wickets += bowler.wickets;
        entry.legalBalls += bowler.legalBalls;
        entry.runsConceded += bowler.runs;
      }
    }
  }

  return [...stats.values()];
}
