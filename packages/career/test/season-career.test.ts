import { describe, expect, it } from 'vitest';
import { FORMATS, Random } from '@pavilion/engine';
import type { Player, Team } from '@pavilion/engine';
import type { SeasonTeam } from '@pavilion/world';
import { createCoach, createPlayerCareer } from '../src/index';
import { playCoachSeason, playPlayerSeason } from '../src/season-career';

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
    battingOrder: Array.from({ length: 11 }, (_, index) =>
      player(`${id}${index + 1}`, strength - index * 2, 0),
    ),
    bowlingAttack: [5, 6, 7, 8, 9].map((index) =>
      player(`${id}${index + 1}`, 20, strength - index),
    ),
  };
}

function league(): SeasonTeam[] {
  return [team('a', 52), team('b', 48), team('c', 44), team('d', 40)].map((entry) => ({
    team: entry,
    rating: { id: entry.id, rating: 1500, matches: 0 },
  }));
}

describe('career season integration', () => {
  it('applies every match to the coach career', () => {
    const coach = createCoach('coach', 'Alex', 'a', new Random(1), '2026-08-31');
    const outcome = playCoachSeason(new Random(11), coach, {
      spec: FORMATS.t20,
      teams: league(),
      doubleRound: true,
    });
    expect(outcome.record.played).toBe(6);
    expect(
      outcome.record.won + outcome.record.lost + outcome.record.drawn + outcome.record.tied,
    ).toBe(6);
    expect(outcome.coach.seasons).toBe(1);
    expect(outcome.coach.reputation).not.toBe(coach.reputation);
  });

  it("credits the player's real match returns to their career", () => {
    const career = createPlayerCareer(
      'a6',
      'Sam',
      'a',
      { batting: 70, bowling: 60, fielding: 60 },
      24,
    );
    const outcome = playPlayerSeason(new Random(12), career, {
      spec: FORMATS.t20,
      teams: league(),
      doubleRound: true,
      playerId: 'a6',
      playerTeamId: 'a',
    });
    expect(outcome.totals.matches).toBe(6);
    expect(outcome.career.matches).toBe(6);
    expect(outcome.career.runs).toBe(outcome.totals.runs);
    expect(outcome.career.wickets).toBe(outcome.totals.wickets);
    expect(outcome.career.development.age).toBe(25);
  });
});
