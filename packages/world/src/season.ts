import { simulateMatch } from '@pavilion/engine';
import type { FormatSpec, MatchConditions, MatchResult, Random, Team } from '@pavilion/engine';
import { roundRobin } from './competition';
import { updatePair } from './rankings';
import type { RatingSnapshot } from './rankings';

export interface SeasonTeam {
  team: Team;
  rating: RatingSnapshot;
}

export interface TableRow {
  teamId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  tied: number;
  points: number;
  rating: number;
}

export interface SeasonOptions {
  spec: FormatSpec;
  teams: SeasonTeam[];
  doubleRound?: boolean;
  conditionsForFixture?: (homeId: string, awayId: string) => MatchConditions | undefined;
}

export interface SeasonMatch {
  round: number;
  homeId: string;
  awayId: string;
  result: MatchResult;
}

export interface SeasonResult {
  matches: SeasonMatch[];
  table: TableRow[];
  championId: string | null;
}

function emptyRow(team: Team, rating: RatingSnapshot): TableRow {
  return {
    teamId: team.id,
    name: team.name,
    played: 0,
    won: 0,
    lost: 0,
    drawn: 0,
    tied: 0,
    points: 0,
    rating: rating.rating,
  };
}

export function simulateSeason(random: Random, options: SeasonOptions): SeasonResult {
  const fixtures = roundRobin(
    options.teams.map((entry) => entry.team.id),
    options.doubleRound ?? false,
  );
  const teams = new Map(options.teams.map((entry) => [entry.team.id, entry.team]));
  const ratings = new Map(options.teams.map((entry) => [entry.team.id, { ...entry.rating }]));
  const table = new Map(
    options.teams.map((entry) => [entry.team.id, emptyRow(entry.team, entry.rating)]),
  );
  const matches: SeasonMatch[] = [];

  for (const fixture of fixtures) {
    const home = teams.get(fixture.homeId);
    const away = teams.get(fixture.awayId);
    const homeRating = ratings.get(fixture.homeId);
    const awayRating = ratings.get(fixture.awayId);
    if (
      home === undefined ||
      away === undefined ||
      homeRating === undefined ||
      awayRating === undefined
    ) {
      continue;
    }

    const conditions = options.conditionsForFixture?.(home.id, away.id);
    const result = simulateMatch(random, { spec: options.spec, home, away, conditions });
    matches.push({ round: fixture.round, homeId: home.id, awayId: away.id, result });

    const homeRow = table.get(home.id);
    const awayRow = table.get(away.id);
    if (homeRow === undefined || awayRow === undefined) continue;

    homeRow.played += 1;
    awayRow.played += 1;

    if (result.drawn || result.tied) {
      if (result.drawn) {
        homeRow.drawn += 1;
        awayRow.drawn += 1;
      } else {
        homeRow.tied += 1;
        awayRow.tied += 1;
      }
      homeRow.points += 1;
      awayRow.points += 1;
      const updated = updatePair(homeRating, awayRating, true);
      ratings.set(home.id, updated.winner);
      ratings.set(away.id, updated.loser);
    } else if (result.winnerTeamId === home.id) {
      homeRow.won += 1;
      awayRow.lost += 1;
      homeRow.points += 2;
      const updated = updatePair(homeRating, awayRating);
      ratings.set(home.id, updated.winner);
      ratings.set(away.id, updated.loser);
    } else if (result.winnerTeamId === away.id) {
      awayRow.won += 1;
      homeRow.lost += 1;
      awayRow.points += 2;
      const updated = updatePair(awayRating, homeRating);
      ratings.set(away.id, updated.winner);
      ratings.set(home.id, updated.loser);
    }
  }

  for (const row of table.values()) {
    row.rating = ratings.get(row.teamId)?.rating ?? row.rating;
  }

  const sorted = [...table.values()].sort(
    (a, b) => b.points - a.points || b.rating - a.rating || b.won - a.won,
  );

  return { matches, table: sorted, championId: sorted[0]?.teamId ?? null };
}
