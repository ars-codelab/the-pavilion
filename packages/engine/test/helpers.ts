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
  const order = Array.from({ length: 11 }, (_, i) =>
    makePlayer(`${prefix}${i + 1}`, 38 - i * 0.8, 0),
  );
  const attack = [
    makePlayer(`${prefix}B1`, 15, 62),
    makePlayer(`${prefix}B2`, 15, 58),
    makePlayer(`${prefix}B3`, 15, 54),
    makePlayer(`${prefix}B4`, 15, 50),
    makePlayer(`${prefix}B5`, 15, 45),
  ];
  return { order, attack };
}
