import type {
  BattingPositionRole,
  BattingStyle,
  BowlingRole,
  BowlingType,
  FieldingType,
  Player,
  Team,
} from '@pavilion/engine';

export interface RawPlayer {
  id: string;
  name: string;
  initials: string;
  role: BattingPositionRole;
  style: BattingStyle;
  bowl: BowlingType;
  bowlRole: BowlingRole;
  field: FieldingType;
  wk: boolean;
  bat: number;
  bowlSkill: number;
  fieldSkill: number;
  batAgg: number;
  bowlAgg: number;
}

export interface RawTeam {
  id: string;
  name: string;
  nationality: string;
  players: RawPlayer[];
}

export interface RawVenue {
  id: string;
  name: string;
  city: string;
  country: string;
  paceAssistance: number;
  spinAssistance: number;
  battingFriendliness: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ROLES = new Set<BattingPositionRole>([
  'opener',
  'specialist',
  'all-rounder',
  'late-order',
  'tail-ender',
]);
const STYLES = new Set<BattingStyle>(['grafter', 'strokeplayer', 'aggressive', 'slogger']);
const BOWL_TYPES = new Set<BowlingType>([
  'none',
  'off-spin',
  'leg-spin',
  'slow',
  'medium',
  'medium-fast',
  'fast-medium',
  'fast',
]);
const BOWL_ROLES = new Set<BowlingRole>([
  'new-ball',
  'main',
  'support',
  'occasional',
  'very-occasional',
  'never',
]);
const FIELD_TYPES = new Set<FieldingType>([
  'wicket-keeper',
  'specialist',
  'slip',
  'normal',
  'poor',
]);

function checkNumber(
  errors: string[],
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  where: string,
): void {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    errors.push(`${where}: ${key} must be a number in [${min}, ${max}]`);
  }
}

export function validateVenue(value: unknown, index = 0): string[] {
  const where = `venue[${index}]`;
  if (!isRecord(value)) return [`${where}: must be an object`];
  const errors: string[] = [];
  for (const key of ['id', 'name', 'city', 'country']) {
    if (typeof value[key] !== 'string' || value[key] === '') {
      errors.push(`${where}: ${key} must be a non-empty string`);
    }
  }
  checkNumber(errors, value, 'paceAssistance', -5, 5, where);
  checkNumber(errors, value, 'spinAssistance', -5, 5, where);
  checkNumber(errors, value, 'battingFriendliness', -5, 5, where);
  return errors;
}

export function validatePlayer(value: unknown, where: string): string[] {
  if (!isRecord(value)) return [`${where}: must be an object`];
  const errors: string[] = [];
  for (const key of ['id', 'name', 'initials']) {
    if (typeof value[key] !== 'string' || value[key] === '') {
      errors.push(`${where}: ${key} must be a non-empty string`);
    }
  }
  if (typeof value.role !== 'string' || !ROLES.has(value.role as BattingPositionRole)) {
    errors.push(`${where}: invalid role`);
  }
  if (typeof value.style !== 'string' || !STYLES.has(value.style as BattingStyle)) {
    errors.push(`${where}: invalid style`);
  }
  if (typeof value.bowl !== 'string' || !BOWL_TYPES.has(value.bowl as BowlingType)) {
    errors.push(`${where}: invalid bowl type`);
  }
  if (typeof value.bowlRole !== 'string' || !BOWL_ROLES.has(value.bowlRole as BowlingRole)) {
    errors.push(`${where}: invalid bowl role`);
  }
  if (typeof value.field !== 'string' || !FIELD_TYPES.has(value.field as FieldingType)) {
    errors.push(`${where}: invalid fielding type`);
  }
  if (typeof value.wk !== 'boolean') errors.push(`${where}: wk must be a boolean`);
  checkNumber(errors, value, 'bat', 0, 100, where);
  checkNumber(errors, value, 'bowlSkill', 0, 100, where);
  checkNumber(errors, value, 'fieldSkill', 0, 100, where);
  checkNumber(errors, value, 'batAgg', 0, 100, where);
  checkNumber(errors, value, 'bowlAgg', 0, 100, where);
  return errors;
}

export function validateTeam(value: unknown, index = 0): string[] {
  const where = `team[${index}]`;
  if (!isRecord(value)) return [`${where}: must be an object`];
  const errors: string[] = [];
  for (const key of ['id', 'name', 'nationality']) {
    if (typeof value[key] !== 'string' || value[key] === '') {
      errors.push(`${where}: ${key} must be a non-empty string`);
    }
  }
  const players = value.players;
  if (!Array.isArray(players) || players.length < 11) {
    errors.push(`${where}: needs at least 11 players`);
    return errors;
  }
  const ids = new Set<string>();
  players.forEach((player, playerIndex) => {
    const playerErrors = validatePlayer(player, `${where}.player[${playerIndex}]`);
    errors.push(...playerErrors);
    if (isRecord(player) && typeof player.id === 'string') {
      if (ids.has(player.id)) errors.push(`${where}: duplicate player id ${player.id}`);
      ids.add(player.id);
    }
  });
  return errors;
}

export function validateAllVenues(values: readonly unknown[]): string[] {
  return values.flatMap((value, index) => validateVenue(value, index));
}

export function validateAllTeams(values: readonly unknown[]): string[] {
  return values.flatMap((value, index) => validateTeam(value, index));
}

const ROLE_ORDER: Record<BattingPositionRole, number> = {
  opener: 0,
  specialist: 1,
  'all-rounder': 2,
  'late-order': 3,
  'tail-ender': 4,
};

const BOWL_ROLE_ORDER: Record<BowlingRole, number> = {
  'new-ball': 0,
  main: 1,
  support: 2,
  occasional: 3,
  'very-occasional': 4,
  never: 5,
};

export function toEnginePlayer(raw: RawPlayer, nationality: string): Player {
  return {
    id: raw.id,
    surname: raw.name,
    initials: raw.initials,
    nationality,
    battingPositionRole: raw.role,
    battingStyle: raw.style,
    bowlingType: raw.bowl,
    bowlingRole: raw.bowlRole,
    fieldingType: raw.field,
    isWicketKeeper: raw.wk,
    ratings: {
      battingSkill: raw.bat,
      bowlingSkill: raw.bowlSkill,
      fieldingSkill: raw.fieldSkill,
      battingAggression: raw.batAgg,
      bowlingAggression: raw.bowlAgg,
    },
  };
}

export function toEngineTeam(raw: RawTeam): Team {
  const players = raw.players.map((player) => toEnginePlayer(player, raw.nationality));
  const battingOrder = [...players].sort(
    (a, b) =>
      ROLE_ORDER[a.battingPositionRole] - ROLE_ORDER[b.battingPositionRole] ||
      b.ratings.battingSkill - a.ratings.battingSkill,
  );
  const bowlingAttack = players
    .filter((player) => player.bowlingType !== 'none' && player.ratings.bowlingSkill > 0)
    .sort(
      (a, b) =>
        BOWL_ROLE_ORDER[a.bowlingRole] - BOWL_ROLE_ORDER[b.bowlingRole] ||
        b.ratings.bowlingSkill - a.ratings.bowlingSkill,
    )
    .slice(0, 6);
  return { id: raw.id, name: raw.name, battingOrder, bowlingAttack };
}
