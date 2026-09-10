import type { DeliveryModifiers } from './outcome';
import type { BowlingType, FormatId } from './types';

export type WeatherKind = 'sunny' | 'overcast' | 'humid' | 'hot' | 'windy' | 'light-rain';

export interface VenueProfile {
  id: string;
  name: string;
  /** -5..+5, positive helps pace bowlers. */
  paceAssistance: number;
  /** -5..+5, positive helps spin bowlers. */
  spinAssistance: number;
  /** -5..+5, positive helps batting (true bounce, short boundaries, good outfield). */
  battingFriendliness: number;
}

export interface MatchConditions {
  venue?: VenueProfile | null;
  weather?: WeatherKind;
}

export const NEUTRAL_VENUE: VenueProfile = {
  id: 'neutral',
  name: 'Neutral',
  paceAssistance: 0,
  spinAssistance: 0,
  battingFriendliness: 0,
};

const PACE: ReadonlySet<BowlingType> = new Set(['medium', 'medium-fast', 'fast-medium', 'fast']);

const SPIN: ReadonlySet<BowlingType> = new Set(['off-spin', 'leg-spin', 'slow']);

interface PhaseTable {
  scoring: number[];
  wicket: number[];
  boundary: number[];
}

/**
 * Per-innings phase modifiers, from the segmented Cricsheet calibration. Later innings
 * (particularly a Test 4th innings) are harder: more wickets, fewer runs and boundaries.
 */
const PHASE: Record<FormatId, PhaseTable> = {
  test: {
    scoring: [1.0202, 1.0101, 1.0, 0.9697],
    wicket: [0.9223, 0.9709, 1.0194, 1.0874],
    boundary: [1.03, 1.0, 0.99, 0.98],
  },
  odi: {
    scoring: [1.005, 0.995],
    wicket: [0.9709, 1.0291],
    boundary: [1.0, 1.0],
  },
  t20: {
    scoring: [1.005, 0.995],
    wicket: [0.9756, 1.0244],
    boundary: [1.0, 1.0],
  },
};

export interface DeliveryModifierInput {
  format: FormatId;
  bowlerType: BowlingType;
  inningsNumber: number;
  ballAgeOvers: number;
  venue?: VenueProfile | null;
  weather?: WeatherKind;
}

function phaseValue(list: number[], inningsNumber: number): number {
  const index = Math.min(Math.max(inningsNumber - 1, 0), list.length - 1);
  return list[index] ?? 1;
}

export function deliveryModifiers(input: DeliveryModifierInput): DeliveryModifiers {
  const venue = input.venue ?? null;
  const weather = input.weather ?? 'sunny';
  const isPace = PACE.has(input.bowlerType);
  const isSpin = SPIN.has(input.bowlerType);
  const table = PHASE[input.format];

  let wicket = phaseValue(table.wicket, input.inningsNumber);
  let scoring = phaseValue(table.scoring, input.inningsNumber);
  let boundary = phaseValue(table.boundary, input.inningsNumber);

  if (venue !== null) {
    const assist = isPace ? venue.paceAssistance : isSpin ? venue.spinAssistance : 0;
    wicket *= 1 + assist * 0.03;
    scoring *= 1 + (venue.battingFriendliness - assist) * 0.008;
    boundary *= 1 + (venue.battingFriendliness - assist) * 0.012;
  }

  if (weather === 'overcast' && isPace) {
    wicket *= 1.1;
    scoring *= 0.95;
  } else if (weather === 'hot') {
    scoring *= 1.04;
  } else if (weather === 'humid') {
    scoring *= 0.98;
  }

  if (isPace && input.ballAgeOvers < 5) wicket *= 1.2;

  return { wicket, scoring, boundary };
}
