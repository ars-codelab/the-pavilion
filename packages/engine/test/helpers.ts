import type { Team } from '../src/match-sim';
import type { Player } from '../src/types';

export function makePlayer(
  id: string,
  batting = 35,
  bowling = 0,
  overrides: Partial<Player> = {},
): Player {
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
    ...overrides,
  };
}

export function makeSide(prefix: string): { order: Player[]; attack: Player[] } {
  const batting = [45, 42, 40, 38, 36, 34, 30, 26, 18, 12, 8];
  const order = batting.map((skill, index) => makePlayer(`${prefix}${index + 1}`, skill, 0));
  const attack = [46, 43, 40, 37, 30].map((skill, index) =>
    makePlayer(`${prefix}B${index + 1}`, 15, skill),
  );
  return { order, attack };
}

export function makeTeam(id: string, batting: number[], bowling: number[]): Team {
  return {
    id,
    name: id,
    battingOrder: batting.map((skill, index) => makePlayer(`${id}${index + 1}`, skill, 0)),
    bowlingAttack: bowling.map((skill, index) => makePlayer(`${id}B${index + 1}`, 15, skill)),
  };
}
