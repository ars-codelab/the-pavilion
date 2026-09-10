import type { Random } from './rng';
import type { BattingStyle, BowlingType, DismissalKind, FormatId, ResolvedDelivery } from './types';

export interface BattingProfile {
  skill: number;
  aggression: number;
  style: BattingStyle;
}

export interface BowlingProfile {
  skill: number;
  aggression: number;
  type: BowlingType;
}

export interface DeliveryModifiers {
  wicket: number;
  scoring: number;
  boundary: number;
}

export const NEUTRAL_MODIFIERS: DeliveryModifiers = { wicket: 1, scoring: 1, boundary: 1 };

export interface DeliveryContext {
  format: FormatId;
  batter: BattingProfile;
  bowler: BowlingProfile;
  modifiers?: DeliveryModifiers;
}

interface OutcomeTable {
  extraRate: number;
  wicket: number;
  runs: readonly { runs: number; p: number }[];
}

/**
 * Baseline per-delivery outcome distributions per format, before skill/aggression
 * adjustment. Tuned so the raw (average vs average) rates approximate real cricket;
 * refined against Cricsheet in the calibration harness.
 */
const BASE_TABLES: Record<FormatId, OutcomeTable> = {
  test: {
    extraRate: 0.025,
    wicket: 0.0186,
    runs: [
      { runs: 0, p: 0.7064 },
      { runs: 1, p: 0.1413 },
      { runs: 2, p: 0.0607 },
      { runs: 3, p: 0.008 },
      { runs: 4, p: 0.06 },
      { runs: 6, p: 0.005 },
    ],
  },
  odi: {
    extraRate: 0.035,
    wicket: 0.028,
    runs: [
      { runs: 0, p: 0.481 },
      { runs: 1, p: 0.3 },
      { runs: 2, p: 0.08 },
      { runs: 3, p: 0.01 },
      { runs: 4, p: 0.082 },
      { runs: 6, p: 0.019 },
    ],
  },
  t20: {
    extraRate: 0.04,
    wicket: 0.0571,
    runs: [
      { runs: 0, p: 0.303 },
      { runs: 1, p: 0.343 },
      { runs: 2, p: 0.116 },
      { runs: 3, p: 0.01 },
      { runs: 4, p: 0.113 },
      { runs: 6, p: 0.058 },
    ],
  },
};

const STYLE_WICKET: Record<BattingStyle, number> = {
  grafter: 0.85,
  strokeplayer: 1,
  aggressive: 1.15,
  slogger: 1.3,
};

const STYLE_BOUNDARY: Record<BattingStyle, number> = {
  grafter: 0.8,
  strokeplayer: 1,
  aggressive: 1.2,
  slogger: 1.4,
};

const DISMISSALS: readonly { kind: DismissalKind; weight: number }[] = [
  { kind: 'caught', weight: 55 },
  { kind: 'bowled', weight: 20 },
  { kind: 'lbw', weight: 14 },
  { kind: 'run-out', weight: 4 },
  { kind: 'stumped', weight: 3 },
  { kind: 'hit-wicket', weight: 1 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function chooseDismissal(random: Random): DismissalKind {
  return random.weighted(DISMISSALS.map((entry) => ({ value: entry.kind, weight: entry.weight })));
}

export function sampleDelivery(random: Random, context: DeliveryContext): ResolvedDelivery {
  const table = BASE_TABLES[context.format];

  if (random.chance(table.extraRate)) {
    const kind = random.chance(0.55) ? 'wide' : 'noball';
    const runs = random.chance(0.12) ? random.int(1, 4) : 0;
    return { runsOffBat: 0, extra: { kind, runs }, wicket: null };
  }

  const { batter, bowler } = context;
  const modifiers = context.modifiers ?? NEUTRAL_MODIFIERS;
  const skillDiff = clamp((batter.skill - bowler.skill) / 100, -1, 1);
  const pressure = clamp((batter.aggression + bowler.aggression) / 200, 0, 1);

  const wicketFactor =
    clamp(1 - skillDiff * 0.8, 0.25, 3) * (0.7 + pressure * 0.6) * STYLE_WICKET[batter.style];
  const wicket = clamp(table.wicket * wicketFactor * modifiers.wicket, 0.002, 0.35);

  const runBoost = clamp(1 + skillDiff * 0.6, 0.4, 2) * (0.75 + pressure * 0.5) * modifiers.scoring;
  const boundaryBoost = STYLE_BOUNDARY[batter.style] * (0.7 + pressure * 0.6) * modifiers.boundary;

  const adjusted = table.runs.map((entry) => ({
    value: entry.runs,
    weight: entry.runs === 0 ? entry.p : entry.p * runBoost * (entry.runs >= 4 ? boundaryBoost : 1),
  }));

  const runWeight = adjusted.reduce((sum, entry) => sum + entry.weight, 0);
  const scale = (1 - wicket) / runWeight;
  const options: { value: number | 'wicket'; weight: number }[] = adjusted.map((entry) => ({
    value: entry.value,
    weight: entry.weight * scale,
  }));
  options.push({ value: 'wicket', weight: wicket });

  const outcome = random.weighted(options);
  if (outcome === 'wicket') {
    return {
      runsOffBat: 0,
      extra: null,
      wicket: { kind: chooseDismissal(random), batter: 'striker' },
    };
  }
  return { runsOffBat: outcome, extra: null, wicket: null };
}
