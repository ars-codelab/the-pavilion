import type { Random } from './rng';
import { applyDelivery, createInningsState } from './match';
import { deliveryModifiers } from './conditions';
import type { MatchConditions } from './conditions';
import type { BallEvent, BallHighlight } from './events';
import type { Team } from './match-sim';
import { sampleDelivery } from './outcome';
import type {
  BatterInnings,
  BowlerInnings,
  FormatId,
  FormatSpec,
  InningsState,
  Player,
} from './types';

export type TossDecision = 'bat' | 'field';
export type PendingKind = 'toss' | 'bowler' | 'batsman' | 'follow-on';

export interface PendingOption {
  id: string;
  label: string;
  detail?: string;
}

export interface PendingDecision {
  kind: PendingKind;
  prompt: string;
  options: PendingOption[];
}

export interface InteractiveOptions {
  spec: FormatSpec;
  home: Team;
  away: Team;
  /** The team the user controls, or null for a fully automated match. */
  userTeamId?: string | null;
  conditions?: MatchConditions;
  /** Fixed toss; omit to simulate one. */
  toss?: { winnerTeamId: string; decision: TossDecision } | null;
}

export interface InteractiveMetrics {
  deliveries: number;
  dotBalls: number;
  fours: number;
  sixes: number;
}

export interface InteractiveInnings {
  battingTeamId: string;
  bowlingTeamId: string;
  state: InningsState;
  bowlers: BowlerInnings[];
  previousBowlerId: string | null;
  declared: boolean;
  target: number | null;
  maxOvers: number | null;
  metrics: InteractiveMetrics;
}

export interface InteractiveResult {
  format: FormatId;
  resultText: string;
  winnerTeamId: string | null;
  tied: boolean;
  drawn: boolean;
}

export interface InteractiveSnapshot {
  started: boolean;
  done: boolean;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  score: number;
  wickets: number;
  oversText: string;
  target: number | null;
  strikerId: string | null;
  nonStrikerId: string | null;
  bowlerId: string | null;
  battingCard: BatterInnings[];
  bowlers: BowlerInnings[];
  recentBalls: BallEvent[];
  battingAggression: number;
  bowlingAggression: number;
  canDeclare: boolean;
}

const FOLLOW_ON = 200;
const AI_DECLARE_LEAD = 300;
const AGGRESSION_MIN = 20;
const AGGRESSION_MAX = 90;

function metricSeed(): InteractiveMetrics {
  return { deliveries: 0, dotBalls: 0, fours: 0, sixes: 0 };
}

function aggressionValue(level: number): number {
  const clamped = Math.min(10, Math.max(1, Math.round(level)));
  return AGGRESSION_MIN + ((clamped - 1) * (AGGRESSION_MAX - AGGRESSION_MIN)) / 9;
}

function maxBowlerOvers(spec: FormatSpec): number {
  if (spec.id === 't20') return 4;
  if (spec.id === 'odi') return 10;
  return Number.POSITIVE_INFINITY;
}

export class InteractiveMatch {
  readonly spec: FormatSpec;
  readonly home: Team;
  readonly away: Team;
  readonly userTeamId: string | null;
  readonly events: BallEvent[] = [];
  readonly innings: InteractiveInnings[] = [];

  result: InteractiveResult | null = null;
  pending: PendingDecision | null = null;
  battingAggression = 5;
  bowlingAggression = 5;

  private readonly random: Random;
  private readonly conditions: MatchConditions | undefined;
  private readonly budgetBalls: number;
  private tossWinnerId: string;
  private tossDecision: TossDecision | null = null;
  private batFirstId: string;
  private batSecondId: string;
  private started = false;
  private current: InteractiveInnings | null = null;
  private aggregate: Record<string, number> = {};
  private ballsUsed = 0;
  private followOnEnforced = false;
  private nextBowlerId: string | null = null;
  private partialBowlerId: string | null = null;
  private partialLegal = 0;
  private partialConceded = 0;

  constructor(random: Random, options: InteractiveOptions) {
    this.random = random;
    this.spec = options.spec;
    this.home = options.home;
    this.away = options.away;
    this.userTeamId = options.userTeamId ?? null;
    this.conditions = options.conditions;
    this.batFirstId = options.home.id;
    this.batSecondId = options.away.id;

    const maxDays = options.spec.maxDays ?? 5;
    const maxOversPerDay = options.spec.maxOversPerDay ?? 90;
    this.budgetBalls =
      options.spec.inningsPerTeam === 2
        ? maxDays * maxOversPerDay * options.spec.ballsPerOver
        : Number.POSITIVE_INFINITY;

    if (options.toss != null) {
      this.tossWinnerId = options.toss.winnerTeamId;
      this.tossDecision = options.toss.decision;
      this.ensureStarted();
      return;
    }

    const winner = random.chance(0.5) ? options.home : options.away;
    this.tossWinnerId = winner.id;
    if (this.userTeamId === winner.id) {
      this.pending = {
        kind: 'toss',
        prompt: 'You won the toss. Bat or field?',
        options: [
          { id: 'bat', label: 'Bat first' },
          { id: 'field', label: 'Field first' },
        ],
      };
    } else {
      const batBias = options.spec.inningsPerTeam === 2 ? 0.6 : 0.3;
      this.tossDecision = random.chance(batBias) ? 'bat' : 'field';
      this.ensureStarted();
    }
  }

  private teamOf(id: string): Team {
    return id === this.home.id ? this.home : this.away;
  }

  private opponentsOf(id: string): string {
    return id === this.home.id ? this.away.id : this.home.id;
  }

  private playerMap(): Map<string, Player> {
    const map = new Map<string, Player>();
    for (const team of [this.home, this.away]) {
      for (const player of [...team.battingOrder, ...team.bowlingAttack])
        map.set(player.id, player);
    }
    return map;
  }

  private ensureStarted(): void {
    if (this.started) return;
    if (this.pending?.kind === 'toss') throw new Error('resolve the toss before starting');
    const decision = this.tossDecision ?? 'bat';
    this.batFirstId = decision === 'bat' ? this.tossWinnerId : this.opponentsOf(this.tossWinnerId);
    this.batSecondId = this.opponentsOf(this.batFirstId);
    this.started = true;
    this.startInnings(this.batFirstId, this.batSecondId, null);
    if (this.current !== null && this.current.bowlingTeamId === this.userTeamId) {
      this.queueBowlerDecision(this.current);
    }
  }

  private queueBowlerDecision(innings: InteractiveInnings): void {
    const options = this.eligibleBowlers(innings).map((player) => ({
      id: player.id,
      label: player.surname,
      detail: `${player.bowlingType} · skill ${player.ratings.bowlingSkill}`,
    }));
    if (options.length === 0) return;
    this.pending = { kind: 'bowler', prompt: 'Choose the bowler for this over', options };
  }

  private startInnings(battingTeamId: string, bowlingTeamId: string, target: number | null): void {
    const batting = this.teamOf(battingTeamId);
    const maxOvers =
      this.spec.inningsPerTeam === 2
        ? Math.max(0, Math.floor((this.budgetBalls - this.ballsUsed) / this.spec.ballsPerOver))
        : this.spec.maxOversPerInnings;
    this.current = {
      battingTeamId,
      bowlingTeamId,
      state: createInningsState({
        battingTeamId,
        bowlingTeamId,
        battingOrder: batting.battingOrder.map((player) => player.id),
      }),
      bowlers: [],
      previousBowlerId: null,
      declared: false,
      target,
      maxOvers,
      metrics: metricSeed(),
    };
  }

  private oversOf(innings: InteractiveInnings, playerId: string): number {
    const stats = innings.bowlers.find((entry) => entry.playerId === playerId);
    return stats === undefined ? 0 : Math.floor(stats.legalBalls / this.spec.ballsPerOver);
  }

  private eligibleBowlers(innings: InteractiveInnings): Player[] {
    const team = this.teamOf(innings.bowlingTeamId);
    const max = maxBowlerOvers(this.spec);
    const filtered = team.bowlingAttack.filter(
      (player) => player.id !== innings.previousBowlerId && this.oversOf(innings, player.id) < max,
    );
    return filtered.length > 0 ? filtered : team.bowlingAttack;
  }

  private aiChooseBowler(innings: InteractiveInnings): Player {
    const pool = this.eligibleBowlers(innings);
    const candidates = pool.length > 0 ? pool : this.teamOf(innings.bowlingTeamId).bowlingAttack;
    return this.random.weighted(
      candidates.map((player) => ({
        value: player,
        weight: Math.max(1, player.ratings.bowlingSkill) + 5,
      })),
    );
  }

  private bowlerStats(innings: InteractiveInnings, bowlerId: string): BowlerInnings {
    let stats = innings.bowlers.find((entry) => entry.playerId === bowlerId);
    if (stats === undefined) {
      stats = {
        playerId: bowlerId,
        legalBalls: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
        maidens: 0,
      };
      innings.bowlers.push(stats);
    }
    return stats;
  }

  private finished(innings: InteractiveInnings): boolean {
    if (innings.state.closed || innings.state.wickets >= 10) return true;
    if (innings.target !== null && innings.state.runs >= innings.target) return true;
    if (
      innings.maxOvers !== null &&
      innings.state.legalBalls >= innings.maxOvers * this.spec.ballsPerOver
    ) {
      return true;
    }
    return innings.declared;
  }

  private userBatting(): boolean {
    return this.current !== null && this.current.battingTeamId === this.userTeamId;
  }

  private userBowling(): boolean {
    return this.current !== null && this.current.bowlingTeamId === this.userTeamId;
  }

  setAggression(kind: 'batting' | 'bowling', level: number): void {
    if (kind === 'batting') this.battingAggression = level;
    else this.bowlingAggression = level;
  }

  setBattingOrder(order: string[]): void {
    if (this.current === null || this.current.battingTeamId !== this.userTeamId) return;
    const valid = new Set(this.current.state.battingOrder);
    if (order.length !== valid.size || !order.every((id) => valid.has(id))) return;
    this.current.state = { ...this.current.state, battingOrder: [...order] };
  }

  declare(): void {
    if (this.current !== null && this.spec.hasDeclarations && this.current.state.wickets < 10) {
      this.current.declared = true;
    }
  }

  decide(decision: {
    toss?: TossDecision;
    bowlerId?: string;
    batsmanId?: string;
    enforceFollowOn?: boolean;
  }): void {
    const pending = this.pending;
    if (pending === null) return;
    if (pending.kind === 'toss' && decision.toss !== undefined) {
      this.tossDecision = decision.toss;
      this.pending = null;
      this.ensureStarted();
    } else if (pending.kind === 'bowler' && decision.bowlerId !== undefined) {
      this.pending = null;
      this.nextBowlerId = decision.bowlerId;
    } else if (
      pending.kind === 'batsman' &&
      decision.batsmanId !== undefined &&
      this.current !== null
    ) {
      this.pending = null;
      this.applyNextBatsman(this.current, decision.batsmanId);
    } else if (pending.kind === 'follow-on' && decision.enforceFollowOn !== undefined) {
      this.pending = null;
      this.followOnEnforced = decision.enforceFollowOn;
      this.planNext(true);
    }
  }

  autoDecide(): void {
    const pending = this.pending;
    if (pending === null) return;
    if (pending.kind === 'toss') {
      const batBias = this.spec.inningsPerTeam === 2 ? 0.6 : 0.3;
      this.decide({ toss: this.random.chance(batBias) ? 'bat' : 'field' });
    } else if (pending.kind === 'bowler' && this.current !== null) {
      this.decide({ bowlerId: this.aiChooseBowler(this.current).id });
    } else if (pending.kind === 'batsman' && this.current !== null) {
      const next = this.current.state.battingOrder[this.current.state.nextBatter - 1];
      if (next !== undefined) this.decide({ batsmanId: next });
      else this.pending = null;
    } else if (pending.kind === 'follow-on') {
      this.decide({ enforceFollowOn: true });
    }
  }

  private applyNextBatsman(innings: InteractiveInnings, batsmanId: string): void {
    const state = innings.state;
    const nextIndex = state.nextBatter - 1;
    const order = [...state.battingOrder];
    const currentIndex = order.indexOf(batsmanId);
    const displaced = order[nextIndex];
    if (nextIndex < 0 || currentIndex < 0 || displaced === undefined || currentIndex < nextIndex)
      return;
    if (displaced === batsmanId) return;
    order[nextIndex] = batsmanId;
    order[currentIndex] = displaced;
    const batters: [BatterInnings, BatterInnings] = [state.batters[0], state.batters[1]];
    const slot = batters.findIndex((entry) => entry.playerId === displaced);
    if (slot === 0 || slot === 1) {
      batters[slot] = { playerId: batsmanId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
    }
    innings.state = {
      ...state,
      battingOrder: order,
      batters,
      battingCard: state.battingCard.map((entry) =>
        entry.playerId === displaced
          ? { playerId: batsmanId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false }
          : entry,
      ),
    };
  }

  private aggregateOf(teamId: string): number {
    let total = this.aggregate[teamId] ?? 0;
    if (this.current !== null && this.current.battingTeamId === teamId)
      total += this.current.state.runs;
    return total;
  }

  private aiDeclareCheck(): void {
    if (this.current === null || this.spec.inningsPerTeam !== 2) return;
    if (this.current.battingTeamId === this.userTeamId) return;
    const inningsNumber = this.innings.length + 1;
    if (inningsNumber !== 3) return;
    const own = this.aggregateOf(this.current.battingTeamId);
    const opp = this.aggregateOf(this.opponentsOf(this.current.battingTeamId));
    if (own - opp >= AI_DECLARE_LEAD && this.current.state.wickets < 10)
      this.current.declared = true;
  }

  nextOver(): BallEvent[] {
    if (this.result !== null || this.pending !== null) return [];
    this.ensureStarted();
    this.advanceIfNeeded();
    if (this.result !== null || this.pending !== null) return [];
    const innings = this.current;
    if (innings === null) return [];

    const start = this.events.length;
    let bowler: Player;
    let legalThisOver = 0;
    let concededThisOver = 0;

    if (this.partialBowlerId !== null) {
      bowler =
        this.teamOf(innings.bowlingTeamId).bowlingAttack.find(
          (p) => p.id === this.partialBowlerId,
        ) ?? this.aiChooseBowler(innings);
      legalThisOver = this.partialLegal;
      concededThisOver = this.partialConceded;
    } else if (this.nextBowlerId !== null) {
      bowler =
        this.teamOf(innings.bowlingTeamId).bowlingAttack.find((p) => p.id === this.nextBowlerId) ??
        this.aiChooseBowler(innings);
      this.nextBowlerId = null;
    } else if (this.userBowling()) {
      this.queueBowlerDecision(innings);
      return [];
    } else {
      bowler = this.aiChooseBowler(innings);
    }

    while (legalThisOver < this.spec.ballsPerOver && !this.finished(innings)) {
      const legalBefore = innings.state.legalBalls;
      const runsBefore = innings.state.runs;
      this.bowlBall(innings, bowler);
      if (innings.state.legalBalls > legalBefore) legalThisOver += 1;
      concededThisOver += innings.state.runs - runsBefore;

      const last = this.events[this.events.length - 1];
      if (last !== undefined && last.wicketKind !== null && this.userBatting()) {
        const remaining = innings.state.battingOrder.slice(innings.state.nextBatter - 1);
        if (remaining.length > 0 && innings.state.wickets < 10) {
          this.partialBowlerId = bowler.id;
          this.partialLegal = legalThisOver;
          this.partialConceded = concededThisOver;
          const players = this.playerMap();
          this.pending = {
            kind: 'batsman',
            prompt: 'Wicket! Who comes in next?',
            options: remaining.map((id) => ({ id, label: players.get(id)?.surname ?? id })),
          };
          return this.events.slice(start);
        }
      }
    }

    if (legalThisOver === this.spec.ballsPerOver) {
      if (concededThisOver === 0) this.bowlerStats(innings, bowler.id).maidens += 1;
      innings.previousBowlerId = bowler.id;
    }
    this.partialBowlerId = null;
    this.partialLegal = 0;
    this.partialConceded = 0;

    this.aiDeclareCheck();
    this.advanceIfNeeded();
    return this.events.slice(start);
  }

  private progressToken(): number {
    return (
      this.events.length * 1_000_000 +
      this.innings.length * 10_000 +
      (this.current?.state.legalBalls ?? 0)
    );
  }

  simulateOvers(count: number): BallEvent[] {
    const start = this.events.length;
    for (let i = 0; i < count; i += 1) {
      if (this.result !== null) break;
      if (this.pending !== null) this.autoDecide();
      const before = this.progressToken();
      this.nextOver();
      if (this.progressToken() === before) {
        if (this.pending !== null) {
          this.autoDecide();
        } else if (this.result === null) {
          this.nextOver();
        }
      }
    }
    return this.events.slice(start);
  }

  simulateToEnd(): BallEvent[] {
    const start = this.events.length;
    let guard = 0;
    let stall = 0;
    while (this.result === null && guard < 50000) {
      guard += 1;
      if (this.pending !== null) this.autoDecide();
      const before = this.progressToken();
      this.nextOver();
      if (this.progressToken() === before) {
        stall += 1;
        if (stall > 60) break;
      } else {
        stall = 0;
      }
    }
    return this.events.slice(start);
  }

  snapshot(): InteractiveSnapshot {
    const innings = this.current;
    const last = this.events[this.events.length - 1];
    const legalBalls = innings?.state.legalBalls ?? 0;
    const strikerIndex = innings?.state.striker ?? 0;
    return {
      started: this.started,
      done: this.result !== null,
      inningsNumber: this.innings.length + 1,
      battingTeamId: innings?.battingTeamId ?? this.batFirstId,
      bowlingTeamId: innings?.bowlingTeamId ?? this.batSecondId,
      score: innings?.state.runs ?? 0,
      wickets: innings?.state.wickets ?? 0,
      oversText: `${Math.floor(legalBalls / this.spec.ballsPerOver)}.${legalBalls % this.spec.ballsPerOver}`,
      target: innings?.target ?? null,
      strikerId: innings?.state.batters[strikerIndex].playerId ?? null,
      nonStrikerId: innings?.state.batters[strikerIndex === 0 ? 1 : 0].playerId ?? null,
      bowlerId: last?.bowlerId ?? null,
      battingCard: innings?.state.battingCard ?? [],
      bowlers: innings?.bowlers ?? [],
      recentBalls: this.events.slice(-8),
      battingAggression: this.battingAggression,
      bowlingAggression: this.bowlingAggression,
      canDeclare:
        this.spec.hasDeclarations &&
        innings !== null &&
        innings.battingTeamId === this.userTeamId &&
        innings.state.wickets < 10 &&
        this.innings.length + 1 < this.spec.inningsPerTeam * 2,
    };
  }

  private bowlBall(innings: InteractiveInnings, bowler: Player): void {
    const strikerState = innings.state.batters[innings.state.striker];
    const batter = this.playerMap().get(strikerState.playerId);
    if (batter === undefined) return;

    const delivery = sampleDelivery(this.random, {
      format: this.spec.id,
      batter: {
        skill: batter.ratings.battingSkill,
        aggression: aggressionValue(this.battingAggression),
        style: batter.battingStyle,
      },
      bowler: {
        skill: bowler.ratings.bowlingSkill,
        aggression: aggressionValue(this.bowlingAggression),
        type: bowler.bowlingType,
      },
      modifiers: deliveryModifiers({
        format: this.spec.id,
        bowlerType: bowler.bowlingType,
        inningsNumber: this.innings.length + 1,
        ballAgeOvers: innings.state.legalBalls / this.spec.ballsPerOver,
        venue: this.conditions?.venue,
        weather: this.conditions?.weather,
      }),
    });

    const strikerId = strikerState.playerId;
    const nonStrikerId = innings.state.batters[innings.state.striker === 0 ? 1 : 0].playerId;
    const legalBefore = innings.state.legalBalls;
    const extra = delivery.extra;
    const isLegal = extra === null || extra.kind === 'bye' || extra.kind === 'legbye';

    const stats = this.bowlerStats(innings, bowler.id);
    stats.runs +=
      delivery.runsOffBat +
      (extra !== null && (extra.kind === 'wide' || extra.kind === 'noball') ? 1 + extra.runs : 0);
    if (extra?.kind === 'wide') stats.wides += 1;
    if (extra?.kind === 'noball') stats.noBalls += 1;
    if (isLegal) stats.legalBalls += 1;
    if (delivery.wicket !== null && delivery.wicket.kind !== 'run-out') stats.wickets += 1;

    innings.metrics.deliveries += 1;
    if (delivery.runsOffBat === 4) innings.metrics.fours += 1;
    if (delivery.runsOffBat === 6) innings.metrics.sixes += 1;
    const dotRuns =
      delivery.runsOffBat +
      (extra !== null && (extra.kind === 'bye' || extra.kind === 'legbye') ? extra.runs : 0);
    if (isLegal && dotRuns === 0) innings.metrics.dotBalls += 1;

    innings.state = applyDelivery(innings.state, delivery, this.spec.ballsPerOver);
    const batterEntry = innings.state.battingCard.find((entry) => entry.playerId === strikerId);
    const highlight: BallHighlight =
      delivery.wicket !== null
        ? 'wicket'
        : delivery.runsOffBat === 4
          ? 'four'
          : delivery.runsOffBat === 6
            ? 'six'
            : null;
    const teamRuns =
      delivery.runsOffBat +
      (extra === null
        ? 0
        : extra.kind === 'wide' || extra.kind === 'noball'
          ? 1 + extra.runs
          : extra.runs);

    this.events.push({
      inningsIndex: this.innings.length,
      battingTeamId: innings.battingTeamId,
      bowlingTeamId: innings.bowlingTeamId,
      over: Math.floor(legalBefore / this.spec.ballsPerOver),
      ballInOver: (legalBefore % this.spec.ballsPerOver) + 1,
      batterId: strikerId,
      nonStrikerId,
      bowlerId: bowler.id,
      runsOffBat: delivery.runsOffBat,
      extraKind: extra?.kind ?? null,
      wicketKind: delivery.wicket?.kind ?? null,
      totalRuns: teamRuns,
      score: innings.state.runs,
      wickets: innings.state.wickets,
      batterRuns: batterEntry?.runs ?? 0,
      highlight,
    });
  }

  private advanceIfNeeded(): void {
    if (this.result !== null || this.pending !== null || this.current === null) return;
    if (!this.finished(this.current)) return;
    const completed = this.current;
    this.aggregate[completed.battingTeamId] =
      (this.aggregate[completed.battingTeamId] ?? 0) + completed.state.runs;
    this.ballsUsed += completed.state.legalBalls;
    this.innings.push(completed);
    this.current = null;
    this.planNext(false);
  }

  private planNext(followOnResolved: boolean): void {
    const n = this.innings.length;

    if (this.spec.inningsPerTeam === 1) {
      if (n === 1)
        this.startInnings(
          this.batSecondId,
          this.batFirstId,
          (this.aggregate[this.batFirstId] ?? 0) + 1,
        );
      else this.finaliseLimited();
      return;
    }

    if (this.spec.inningsPerTeam === 2) {
      const remaining = Math.floor((this.budgetBalls - this.ballsUsed) / this.spec.ballsPerOver);
      if (remaining <= 0) {
        this.result = this.drawResult();
        return;
      }
    }

    if (n === 1) {
      this.startInnings(this.batSecondId, this.batFirstId, null);
      return;
    }

    if (n === 2) {
      if (!followOnResolved) {
        const firstAgg = this.aggregate[this.batFirstId] ?? 0;
        const secondAgg = this.aggregate[this.batSecondId] ?? 0;
        const secondAllOut = this.innings[1]?.state.closed ?? false;
        const canFollowOn = secondAllOut && firstAgg - secondAgg >= FOLLOW_ON;
        if (canFollowOn && this.userTeamId === this.batFirstId) {
          this.pending = {
            kind: 'follow-on',
            prompt: `Enforce the follow-on? (${firstAgg - secondAgg} runs ahead)`,
            options: [
              { id: 'yes', label: 'Enforce follow-on' },
              { id: 'no', label: 'Bat again' },
            ],
          };
          return;
        }
        this.followOnEnforced = canFollowOn;
      }
      const battingTeamId = this.followOnEnforced ? this.batSecondId : this.batFirstId;
      this.startInnings(battingTeamId, this.opponentsOf(battingTeamId), null);
      return;
    }

    if (n === 3) {
      if (this.followOnEnforced) {
        const firstAgg = this.aggregate[this.batFirstId] ?? 0;
        const thirdAgg = this.aggregate[this.batSecondId] ?? 0;
        const thirdAllOut = this.innings[2]?.state.closed ?? false;
        if (thirdAllOut && thirdAgg < firstAgg) {
          const lead = firstAgg - thirdAgg;
          this.result = {
            format: this.spec.id,
            winnerTeamId: this.batFirstId,
            tied: false,
            drawn: false,
            resultText: `${this.teamOf(this.batFirstId).name} won by an innings and ${lead} run${lead === 1 ? '' : 's'}`,
          };
          return;
        }
      }
      const battingTeamId = this.followOnEnforced ? this.batFirstId : this.batSecondId;
      const bowlingId = this.opponentsOf(battingTeamId);
      const target = Math.max(
        1,
        (this.aggregate[bowlingId] ?? 0) - (this.aggregate[battingTeamId] ?? 0) + 1,
      );
      this.startInnings(battingTeamId, bowlingId, target);
      return;
    }

    this.finaliseTest();
  }

  private finaliseLimited(): void {
    const first = this.innings[0];
    const second = this.innings[1];
    if (first === undefined || second === undefined) return;
    if (second.state.runs > first.state.runs) {
      const wickets = Math.max(1, 10 - second.state.wickets);
      this.result = {
        format: this.spec.id,
        winnerTeamId: second.battingTeamId,
        tied: false,
        drawn: false,
        resultText: `${this.teamOf(second.battingTeamId).name} won by ${wickets} wicket${wickets === 1 ? '' : 's'}`,
      };
    } else if (second.state.runs === first.state.runs) {
      this.result = {
        format: this.spec.id,
        winnerTeamId: null,
        tied: true,
        drawn: false,
        resultText: 'Match tied',
      };
    } else {
      const margin = Math.max(1, first.state.runs - second.state.runs);
      this.result = {
        format: this.spec.id,
        winnerTeamId: first.battingTeamId,
        tied: false,
        drawn: false,
        resultText: `${this.teamOf(first.battingTeamId).name} won by ${margin} run${margin === 1 ? '' : 's'}`,
      };
    }
  }

  private finaliseTest(): void {
    const fourth = this.innings[3];
    if (fourth === undefined) {
      this.result = this.drawResult();
      return;
    }
    const target = fourth.target ?? 1;
    if (fourth.state.runs >= target) {
      const wickets = Math.max(1, 10 - fourth.state.wickets);
      this.result = {
        format: this.spec.id,
        winnerTeamId: fourth.battingTeamId,
        tied: false,
        drawn: false,
        resultText: `${this.teamOf(fourth.battingTeamId).name} won by ${wickets} wicket${wickets === 1 ? '' : 's'}`,
      };
    } else if (fourth.state.closed && fourth.state.runs === target - 1) {
      this.result = {
        format: this.spec.id,
        winnerTeamId: null,
        tied: true,
        drawn: false,
        resultText: 'Match tied',
      };
    } else if (fourth.state.closed) {
      const margin = Math.max(1, target - 1 - fourth.state.runs);
      const winner = this.opponentsOf(fourth.battingTeamId);
      this.result = {
        format: this.spec.id,
        winnerTeamId: winner,
        tied: false,
        drawn: false,
        resultText: `${this.teamOf(winner).name} won by ${margin} run${margin === 1 ? '' : 's'}`,
      };
    } else {
      this.result = this.drawResult();
    }
  }

  private drawResult(): InteractiveResult {
    return {
      format: this.spec.id,
      winnerTeamId: null,
      tied: false,
      drawn: true,
      resultText: 'Match drawn',
    };
  }
}
