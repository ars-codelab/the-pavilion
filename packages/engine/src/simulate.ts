import type { Random } from './rng';
import { applyDelivery, createInningsState, isInningsComplete } from './match';
import { sampleDelivery } from './outcome';
import type { BowlerInnings, FormatSpec, InningsState, Player } from './types';

export interface SimulateInningsOptions {
  spec: FormatSpec;
  battingTeamId: string;
  bowlingTeamId: string;
  battingOrder: Player[];
  bowlingAttack: Player[];
  /** Chase: stop as soon as this many runs are scored. */
  target?: number | null;
  /** Cap on overs for this innings (e.g. remaining match time). Defaults to the format cap. */
  maxOvers?: number | null;
  /** Declaration: stop at the end of an over once this many runs are scored. */
  declareAt?: number | null;
}

export interface SimulatedInningsMetrics {
  deliveries: number;
  dotBalls: number;
  fours: number;
  sixes: number;
  wides: number;
  noBalls: number;
}

export interface SimulatedInnings {
  state: InningsState;
  bowlers: BowlerInnings[];
  metrics: SimulatedInningsMetrics;
  declared: boolean;
}

function maxBowlerOvers(spec: FormatSpec): number {
  if (spec.id === 't20') return 4;
  if (spec.id === 'odi') return 10;
  return Number.POSITIVE_INFINITY;
}

function chooseBowler(
  random: Random,
  attack: readonly Player[],
  overs: ReadonlyMap<string, number>,
  maxOvers: number,
  previousId: string | null,
): Player | null {
  const indexed = attack.map((player, index) => ({ player, index }));
  const eligible = indexed.filter(
    (entry) => entry.player.id !== previousId && (overs.get(entry.player.id) ?? 0) < maxOvers,
  );
  const pool =
    eligible.length > 0
      ? eligible
      : indexed.filter((entry) => (overs.get(entry.player.id) ?? 0) < maxOvers);
  if (pool.length === 0) return null;
  const first = pool[0];
  if (first === undefined) return null;
  if (pool.length === 1) return first.player;
  return random.weighted(
    pool.map((entry) => ({
      value: entry.player,
      weight: Math.max(1, entry.player.ratings.bowlingSkill) + (attack.length - entry.index) * 5,
    })),
  );
}

export function simulateInnings(random: Random, options: SimulateInningsOptions): SimulatedInnings {
  const { spec, battingTeamId, bowlingTeamId, battingOrder, bowlingAttack } = options;
  if (battingOrder.length < 2) throw new Error('a batting order needs at least two players');
  if (bowlingAttack.length === 0) throw new Error('a bowling attack needs at least one player');

  const target = options.target ?? null;
  const maxOvers = options.maxOvers === undefined ? spec.maxOversPerInnings : options.maxOvers;
  const declareAt = options.declareAt ?? null;

  const players = new Map<string, Player>();
  for (const player of [...battingOrder, ...bowlingAttack]) players.set(player.id, player);

  let state = createInningsState({
    battingTeamId,
    bowlingTeamId,
    battingOrder: battingOrder.map((player) => player.id),
  });

  const bowlerStats = new Map<string, BowlerInnings>();
  const bowlerOvers = new Map<string, number>();
  const bowlerMax = maxBowlerOvers(spec);
  const metrics: SimulatedInningsMetrics = {
    deliveries: 0,
    dotBalls: 0,
    fours: 0,
    sixes: 0,
    wides: 0,
    noBalls: 0,
  };
  let declared = false;
  let previousBowlerId: string | null = null;

  const finished = (): boolean => {
    if (isInningsComplete(state, spec)) return true;
    if (target !== null && state.runs >= target) return true;
    if (maxOvers !== null && state.legalBalls >= maxOvers * spec.ballsPerOver) return true;
    return false;
  };

  while (!finished()) {
    const bowler = chooseBowler(random, bowlingAttack, bowlerOvers, bowlerMax, previousBowlerId);
    if (bowler === null) break;
    previousBowlerId = bowler.id;

    let stats = bowlerStats.get(bowler.id);
    if (stats === undefined) {
      stats = {
        playerId: bowler.id,
        legalBalls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
        maidens: 0,
      };
      bowlerStats.set(bowler.id, stats);
    }

    let legalThisOver = 0;
    let concededThisOver = 0;

    while (legalThisOver < spec.ballsPerOver && !finished()) {
      const strikerState = state.batters[state.striker];
      const batter = players.get(strikerState.playerId);
      if (batter === undefined) break;

      const delivery = sampleDelivery(random, {
        format: spec.id,
        batter: {
          skill: batter.ratings.battingSkill,
          aggression: batter.ratings.battingAggression,
          style: batter.battingStyle,
        },
        bowler: {
          skill: bowler.ratings.bowlingSkill,
          aggression: bowler.ratings.bowlingAggression,
        },
      });

      const extra = delivery.extra;
      const isLegal = extra === null || extra.kind === 'bye' || extra.kind === 'legbye';
      const conceded =
        delivery.runsOffBat +
        (extra !== null && (extra.kind === 'wide' || extra.kind === 'noball') ? 1 + extra.runs : 0);

      stats.runs += conceded;
      concededThisOver += conceded;
      if (extra?.kind === 'wide') stats.wides += 1;
      if (extra?.kind === 'noball') stats.noBalls += 1;
      if (isLegal) {
        stats.legalBalls += 1;
        legalThisOver += 1;
      }
      if (delivery.wicket !== null && delivery.wicket.kind !== 'run-out') stats.wickets += 1;

      metrics.deliveries += 1;
      if (extra?.kind === 'wide') metrics.wides += 1;
      if (extra?.kind === 'noball') metrics.noBalls += 1;
      if (delivery.runsOffBat === 4) metrics.fours += 1;
      if (delivery.runsOffBat === 6) metrics.sixes += 1;
      const dotRuns =
        delivery.runsOffBat +
        (extra !== null && (extra.kind === 'bye' || extra.kind === 'legbye') ? extra.runs : 0);
      if (isLegal && dotRuns === 0) metrics.dotBalls += 1;

      state = applyDelivery(state, delivery, spec.ballsPerOver);
    }

    if (legalThisOver === spec.ballsPerOver && concededThisOver === 0) stats.maidens += 1;
    bowlerOvers.set(bowler.id, (bowlerOvers.get(bowler.id) ?? 0) + 1);

    if (
      declareAt !== null &&
      !state.closed &&
      state.runs >= declareAt &&
      target === null &&
      !finished()
    ) {
      declared = true;
      break;
    }
  }

  return { state, bowlers: [...bowlerStats.values()], metrics, declared };
}
