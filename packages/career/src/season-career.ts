import type { FormatSpec, MatchConditions, MatchResult, Random } from '@pavilion/engine';
import { simulateSeason } from '@pavilion/world';
import type { SeasonResult, SeasonTeam } from '@pavilion/world';
import { recordResult } from './coach';
import { recordObjectiveProgress } from './objectives';
import { advanceYear, recordAppearance } from './player';
import type { CoachCareer, MatchOutcome, PlayerCareer } from './types';

export interface CareerSeasonInput {
  spec: FormatSpec;
  teams: SeasonTeam[];
  doubleRound?: boolean;
  conditionsForFixture?: (homeId: string, awayId: string) => MatchConditions | undefined;
}

function outcomeFor(match: MatchResult, teamId: string): MatchOutcome {
  if (match.drawn) return 'D';
  if (match.tied) return 'T';
  return match.winnerTeamId === teamId ? 'W' : 'L';
}

export interface CoachSeasonResult {
  season: SeasonResult;
  coach: CoachCareer;
  record: { played: number; won: number; lost: number; drawn: number; tied: number };
}

/** Play a full season and apply every result to the coach's career. */
export function playCoachSeason(
  random: Random,
  coach: CoachCareer,
  input: CareerSeasonInput,
): CoachSeasonResult {
  const season = simulateSeason(random, input);
  let updated = coach;
  const record = { played: 0, won: 0, lost: 0, drawn: 0, tied: 0 };

  for (const match of season.matches) {
    if (match.homeId !== coach.teamId && match.awayId !== coach.teamId) continue;
    const outcome = outcomeFor(match.result, coach.teamId);
    updated = recordResult(updated, outcome);
    record.played += 1;
    if (outcome === 'W') record.won += 1;
    else if (outcome === 'L') record.lost += 1;
    else if (outcome === 'D') record.drawn += 1;
    else record.tied += 1;
  }

  if (season.championId === coach.teamId) {
    updated = {
      ...updated,
      objectives: recordObjectiveProgress(updated.objectives, 'win-series', 1),
    };
  }

  updated = { ...updated, seasons: updated.seasons + 1 };
  return { season, coach: updated, record };
}

interface PlayerMatchStats {
  runs: number;
  balls: number;
  wickets: number;
  legalBalls: number;
}

function playerMatchStats(match: MatchResult, teamId: string, playerId: string): PlayerMatchStats {
  let runs = 0;
  let balls = 0;
  let wickets = 0;
  let legalBalls = 0;
  for (const innings of match.innings) {
    if (innings.battingTeamId === teamId) {
      const entry = innings.state.battingCard.find((batter) => batter.playerId === playerId);
      if (entry !== undefined) {
        runs += entry.runs;
        balls += entry.balls;
      }
    }
    if (innings.bowlingTeamId === teamId) {
      const entry = innings.bowlers.find((bowler) => bowler.playerId === playerId);
      if (entry !== undefined) {
        wickets += entry.wickets;
        legalBalls += entry.legalBalls;
      }
    }
  }
  return { runs, balls, wickets, legalBalls };
}

export interface PlayerSeasonInput extends CareerSeasonInput {
  playerId: string;
  playerTeamId: string;
}

export interface PlayerSeasonResult {
  season: SeasonResult;
  career: PlayerCareer;
  totals: { matches: number; runs: number; wickets: number };
}

/** Play a season, crediting the player's real match returns to their career. */
export function playPlayerSeason(
  random: Random,
  career: PlayerCareer,
  input: PlayerSeasonInput,
): PlayerSeasonResult {
  const season = simulateSeason(random, input);
  let updated = career;
  const totals = { matches: 0, runs: 0, wickets: 0 };

  for (const match of season.matches) {
    if (match.homeId !== input.playerTeamId && match.awayId !== input.playerTeamId) continue;
    const stats = playerMatchStats(match.result, input.playerTeamId, input.playerId);
    const won = match.result.winnerTeamId === input.playerTeamId;
    const performance = Math.max(0, Math.min(100, 40 + stats.runs * 0.5 + stats.wickets * 10));
    const workload = 2 + Math.round(stats.legalBalls / 6);
    updated = recordAppearance(updated, {
      runs: stats.runs,
      wickets: stats.wickets,
      won,
      workload,
      performance,
    });
    totals.matches += 1;
    totals.runs += stats.runs;
    totals.wickets += stats.wickets;
  }

  updated = advanceYear(updated);
  return { season, career: updated, totals };
}
