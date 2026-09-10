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

export type MarqueeRole = 'batter' | 'bowler' | 'all-rounder' | 'keeper';

export type HairStyle = 'short' | 'curly' | 'bald' | 'long' | 'cap';
export type FacialHair = 'none' | 'stubble' | 'moustache' | 'beard';
export type Built = 'slight' | 'medium' | 'strong';

export interface PortraitSpec {
  /** 1 (light) to 5 (deep). */
  skinTone: number;
  hairStyle: HairStyle;
  hairColour: string;
  facialHair: FacialHair;
  build: Built;
  headgear: 'none' | 'cap' | 'helmet';
}

export interface RawMarquee {
  id: string;
  name: string;
  country: string;
  era: string;
  role: MarqueeRole;
  /** Optional explicit descriptor for a closer likeness; otherwise derived. */
  portrait?: PortraitSpec;
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

const MARQUEE_ROLES = new Set<MarqueeRole>(['batter', 'bowler', 'all-rounder', 'keeper']);
const HAIR_STYLES: HairStyle[] = ['short', 'curly', 'bald', 'long', 'cap'];
const FACIAL_HAIR: FacialHair[] = ['none', 'stubble', 'moustache', 'beard'];
const BUILDS: Built[] = ['slight', 'medium', 'strong'];
const HAIR_COLOURS = ['black', 'dark-brown', 'brown', 'blond', 'auburn', 'grey'];

const SKIN_BY_COUNTRY: Record<string, number> = {
  England: 1,
  Australia: 2,
  'New Zealand': 2,
  'South Africa': 3,
  India: 4,
  Pakistan: 4,
  Bangladesh: 4,
  Afghanistan: 4,
  'Sri Lanka': 5,
  'West Indies': 5,
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function derivePortrait(raw: RawMarquee): PortraitSpec {
  if (raw.portrait !== undefined) return raw.portrait;
  const hash = hashString(raw.id);
  return {
    skinTone: SKIN_BY_COUNTRY[raw.country] ?? (hash % 5) + 1,
    hairStyle: HAIR_STYLES[hash % HAIR_STYLES.length] ?? 'short',
    hairColour: HAIR_COLOURS[(hash >> 3) % HAIR_COLOURS.length] ?? 'black',
    facialHair: FACIAL_HAIR[(hash >> 6) % FACIAL_HAIR.length] ?? 'none',
    build: raw.role === 'bowler' ? 'strong' : (BUILDS[(hash >> 9) % BUILDS.length] ?? 'medium'),
    headgear: raw.era >= '2010s' ? 'cap' : 'none',
  };
}

export function validateMarquee(value: unknown, index = 0): string[] {
  const where = `marquee[${index}]`;
  if (!isRecord(value)) return [`${where}: must be an object`];
  const errors: string[] = [];
  for (const key of ['id', 'name', 'country', 'era']) {
    if (typeof value[key] !== 'string' || value[key] === '') {
      errors.push(`${where}: ${key} must be a non-empty string`);
    }
  }
  if (typeof value.role !== 'string' || !MARQUEE_ROLES.has(value.role as MarqueeRole)) {
    errors.push(`${where}: invalid role`);
  }
  if (value.portrait !== undefined && !isRecord(value.portrait)) {
    errors.push(`${where}: portrait must be an object when present`);
  }
  return errors;
}

export function validateAllMarquee(values: readonly unknown[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  values.forEach((value, index) => {
    errors.push(...validateMarquee(value, index));
    if (isRecord(value) && typeof value.id === 'string') {
      if (seen.has(value.id)) errors.push(`marquee: duplicate id ${value.id}`);
      seen.add(value.id);
    }
  });
  return errors;
}
