import { describe, expect, it } from 'vitest';
import { FORMATS, Random } from '@pavilion/engine';
import type { Player, Team } from '@pavilion/engine';
import { simulateSeason } from '../src/season';
import type { SeasonTeam } from '../src/season';

function player(id: string, batting: number, bowling: number): Player {
  return {
    id,
    surname: id,
    initials: 'X',
    nationality: 'TST',
    battingPositionRole: 'specialist',
    battingStyle: 'strokeplayer',
    bowlingType: bowling > 0 ? 'fast' : 'none',
    bowlingRole: bowling > 0 ? 'main' : 'never',
    fieldingType: 'normal',
    isWicketKeeper: false,
    ratings: {
      battingSkill: batting,
      bowlingSkill: bowling,
      fieldingSkill: 15,
      battingAggression: 50,
      bowlingAggression: 50,
    },
  };
}

function team(id: string, strength: number): Team {
  return {
    id,
    name: id.toUpperCase(),
    battingOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) =>
      player(`${id}${index + 1}`, strength - index * 2, 0),
    ),
    bowlingAttack: [0, 1, 2, 3].map((index) =>
      player(`${id}B${index + 1}`, 12, strength - index * 2),
    ),
  };
}

function league(): SeasonTeam[] {
  return [team('a', 52), team('b', 48), team('c', 44), team('d', 40)].map((entry) => ({
    team: entry,
    rating: { id: entry.id, rating: 1500, matches: 0 },
  }));
}

describe('simulateSeason', () => {
  it('plays a full double round robin and builds a table', () => {
    const result = simulateSeason(new Random(1), {
      spec: FORMATS.t20,
      teams: league(),
      doubleRound: true,
    });
    expect(result.matches).toHaveLength(12);
    for (const row of result.table) expect(row.played).toBe(6);
    const totalPoints = result.table.reduce((sum, row) => sum + row.points, 0);
    expect(totalPoints).toBeGreaterThan(0);
    expect(result.championId).not.toBeNull();
  });

  it('ranks the champion by points', () => {
    const result = simulateSeason(new Random(2), { spec: FORMATS.t20, teams: league() });
    const champion = result.table.find((row) => row.teamId === result.championId);
    expect(champion).toBeDefined();
    if (champion === undefined) return;
    for (const row of result.table) {
      expect(champion.points).toBeGreaterThanOrEqual(row.points);
    }
  });

  it('is deterministic for a seed', () => {
    const a = simulateSeason(new Random('season'), {
      spec: FORMATS.t20,
      teams: league(),
      doubleRound: true,
    });
    const b = simulateSeason(new Random('season'), {
      spec: FORMATS.t20,
      teams: league(),
      doubleRound: true,
    });
    expect(a.table).toEqual(b.table);
    expect(a.matches.map((match) => match.result.resultText)).toEqual(
      b.matches.map((match) => match.result.resultText),
    );
  });

  it('updates ratings from their starting values', () => {
    const result = simulateSeason(new Random(3), {
      spec: FORMATS.t20,
      teams: league(),
      doubleRound: true,
    });
    expect(result.table.some((row) => row.rating !== 1500)).toBe(true);
  });
});
