import type { BatterInnings, FormatSpec, InningsState, ResolvedDelivery } from './types';

export interface CreateInningsParams {
  battingTeamId: string;
  bowlingTeamId: string;
  battingOrder: string[];
}

export function createInningsState(params: CreateInningsParams): InningsState {
  const first = params.battingOrder[0];
  const second = params.battingOrder[1];
  if (first === undefined || second === undefined) {
    throw new Error('batting order must contain at least two players');
  }
  return {
    battingTeamId: params.battingTeamId,
    bowlingTeamId: params.bowlingTeamId,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    batters: [
      { playerId: first, runs: 0, balls: 0, fours: 0, sixes: 0, out: false },
      { playerId: second, runs: 0, balls: 0, fours: 0, sixes: 0, out: false },
    ],
    striker: 0,
    battingOrder: [...params.battingOrder],
    nextBatter: 2,
    closed: false,
  };
}

function newBatter(playerId: string): BatterInnings {
  return { playerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
}

/**
 * Apply a resolved delivery to an innings, enforcing the laws of cricket. Pure: returns a
 * new state and never mutates the input.
 */
export function applyDelivery(
  state: InningsState,
  delivery: ResolvedDelivery,
  ballsPerOver: number,
): InningsState {
  if (state.closed) return state;

  const extra = delivery.extra;
  const isWideOrNoBall = extra !== null && (extra.kind === 'wide' || extra.kind === 'noball');
  const isByeOrLegBye = extra !== null && (extra.kind === 'bye' || extra.kind === 'legbye');
  const legal = !isWideOrNoBall;

  const extraRuns = extra === null ? 0 : isWideOrNoBall ? 1 + extra.runs : extra.runs;
  const totalRuns = delivery.runsOffBat + extraRuns;

  const batters: [BatterInnings, BatterInnings] = [
    { ...state.batters[0] },
    { ...state.batters[1] },
  ];
  const striker = state.striker;
  const strikerBat = batters[striker];

  if (legal) {
    strikerBat.balls += 1;
    strikerBat.runs += delivery.runsOffBat;
    if (delivery.runsOffBat === 4) strikerBat.fours += 1;
    if (delivery.runsOffBat === 6) strikerBat.sixes += 1;
  }

  let wickets = state.wickets;
  let closed: boolean = state.closed;
  let nextBatter = state.nextBatter;
  let newStriker = striker;

  if (delivery.wicket !== null) {
    wickets += 1;
    const outIndex: 0 | 1 = delivery.wicket.batter === 'striker' ? striker : striker === 0 ? 1 : 0;
    batters[outIndex].out = true;
    const replacementId = state.battingOrder[nextBatter];
    if (replacementId !== undefined) {
      batters[outIndex] = newBatter(replacementId);
      nextBatter += 1;
      if (delivery.wicket.batter === 'striker') newStriker = outIndex;
    }
    if (wickets >= 10) closed = true;
  }

  const runningRuns = delivery.runsOffBat + (isByeOrLegBye ? extraRuns : 0);
  if (!closed && runningRuns % 2 === 1) {
    newStriker = newStriker === 0 ? 1 : 0;
  }

  const legalBalls = state.legalBalls + (legal ? 1 : 0);

  if (!closed && legal && ballsPerOver > 0 && legalBalls % ballsPerOver === 0) {
    newStriker = newStriker === 0 ? 1 : 0;
  }

  return {
    ...state,
    runs: state.runs + totalRuns,
    wickets,
    legalBalls,
    batters,
    striker: newStriker,
    nextBatter,
    closed,
  };
}

export function isInningsComplete(state: InningsState, spec: FormatSpec): boolean {
  if (state.closed || state.wickets >= 10) return true;
  if (spec.maxOversPerInnings === null) return false;
  return state.legalBalls >= spec.maxOversPerInnings * spec.ballsPerOver;
}

export function currentOver(state: InningsState, ballsPerOver: number): number {
  return Math.floor(state.legalBalls / ballsPerOver);
}

export function ballsThisOver(state: InningsState, ballsPerOver: number): number {
  return state.legalBalls % ballsPerOver;
}
