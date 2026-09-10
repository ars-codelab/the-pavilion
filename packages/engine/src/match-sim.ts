import type { Random } from './rng';
import { simulateInnings } from './simulate';
import type { SimulatedInningsMetrics } from './simulate';
import type { BowlerInnings, FormatId, FormatSpec, InningsState, Player } from './types';

export interface Team {
  id: string;
  name: string;
  battingOrder: Player[];
  bowlingAttack: Player[];
}

export interface MatchToss {
  winnerTeamId: string;
  decision: 'bat' | 'field';
}

export interface MatchInningsResult {
  battingTeamId: string;
  bowlingTeamId: string;
  state: InningsState;
  bowlers: BowlerInnings[];
  metrics: SimulatedInningsMetrics;
  declared: boolean;
  target: number | null;
}

export interface MatchResult {
  format: FormatId;
  toss: MatchToss;
  innings: MatchInningsResult[];
  winnerTeamId: string | null;
  tied: boolean;
  drawn: boolean;
  resultText: string;
}

export interface SimulateMatchOptions {
  spec: FormatSpec;
  home: Team;
  away: Team;
  /** Fixed toss outcome; omit to simulate one. */
  toss?: MatchToss | null;
}

const DECLARE_LEAD = 300;
const FOLLOW_ON_FALLBACK = 200;

function simulateToss(random: Random, home: Team, away: Team, spec: FormatSpec): MatchToss {
  const winner = random.chance(0.5) ? home : away;
  const batBias = spec.inningsPerTeam === 2 ? 0.6 : 0.3;
  return { winnerTeamId: winner.id, decision: random.chance(batBias) ? 'bat' : 'field' };
}

function otherTeam(home: Team, away: Team, id: string): Team {
  return home.id === id ? away : home;
}

function winByWickets(team: Team, wickets: number): string {
  const margin = Math.max(1, 10 - wickets);
  return `${team.name} won by ${margin} wicket${margin === 1 ? '' : 's'}`;
}

function winByRuns(team: Team, runs: number): string {
  const margin = Math.max(1, runs);
  return `${team.name} won by ${margin} run${margin === 1 ? '' : 's'}`;
}

export function simulateMatch(random: Random, options: SimulateMatchOptions): MatchResult {
  const { spec, home, away } = options;
  const toss = options.toss ?? simulateToss(random, home, away, spec);
  const tossWinner = toss.winnerTeamId === home.id ? home : away;
  const tossLoser = tossWinner.id === home.id ? away : home;
  const batFirst = toss.decision === 'bat' ? tossWinner : tossLoser;
  const batSecond = batFirst.id === home.id ? away : home;

  const innings: MatchInningsResult[] = [];
  const aggregate = new Map<string, number>();

  const play = (
    batting: Team,
    bowling: Team,
    extras: { target?: number | null; maxOvers?: number | null; declareAt?: number | null },
  ): MatchInningsResult => {
    const result = simulateInnings(random, {
      spec,
      battingTeamId: batting.id,
      bowlingTeamId: bowling.id,
      battingOrder: batting.battingOrder,
      bowlingAttack: bowling.bowlingAttack,
      target: extras.target ?? null,
      maxOvers: extras.maxOvers === undefined ? spec.maxOversPerInnings : extras.maxOvers,
      declareAt: extras.declareAt ?? null,
    });
    const entry: MatchInningsResult = {
      battingTeamId: batting.id,
      bowlingTeamId: bowling.id,
      state: result.state,
      bowlers: result.bowlers,
      metrics: result.metrics,
      declared: result.declared,
      target: extras.target ?? null,
    };
    innings.push(entry);
    aggregate.set(batting.id, (aggregate.get(batting.id) ?? 0) + result.state.runs);
    return entry;
  };

  if (spec.inningsPerTeam === 1) {
    const first = play(batFirst, batSecond, {});
    const target = first.state.runs + 1;
    const second = play(batSecond, batFirst, { target });

    if (second.state.runs >= target) {
      return {
        format: spec.id,
        toss,
        innings,
        winnerTeamId: batSecond.id,
        tied: false,
        drawn: false,
        resultText: winByWickets(batSecond, second.state.wickets),
      };
    }
    if (second.state.runs === first.state.runs) {
      return {
        format: spec.id,
        toss,
        innings,
        winnerTeamId: null,
        tied: true,
        drawn: false,
        resultText: 'Match tied',
      };
    }
    return {
      format: spec.id,
      toss,
      innings,
      winnerTeamId: batFirst.id,
      tied: false,
      drawn: false,
      resultText: winByRuns(batFirst, target - 1 - second.state.runs),
    };
  }

  const maxDays = spec.maxDays ?? 5;
  const maxOversPerDay = spec.maxOversPerDay ?? 90;
  const budgetBalls = maxDays * maxOversPerDay * spec.ballsPerOver;
  let ballsUsed = 0;
  const remainingOvers = (): number =>
    Math.floor(Math.max(0, budgetBalls - ballsUsed) / spec.ballsPerOver);

  const draw = (): MatchResult => ({
    format: spec.id,
    toss,
    innings,
    winnerTeamId: null,
    tied: false,
    drawn: true,
    resultText: 'Match drawn',
  });

  const first = play(batFirst, batSecond, { maxOvers: remainingOvers() });
  ballsUsed += first.state.legalBalls;
  if (remainingOvers() <= 0) return draw();

  const second = play(batSecond, batFirst, { maxOvers: remainingOvers() });
  ballsUsed += second.state.legalBalls;

  const firstTotal = aggregate.get(batFirst.id) ?? 0;
  const secondTotal = aggregate.get(batSecond.id) ?? 0;
  const followOnRuns = spec.followOnRuns ?? FOLLOW_ON_FALLBACK;
  const enforceFollowOn = second.state.closed && firstTotal - secondTotal >= followOnRuns;

  if (remainingOvers() <= 0) return draw();

  const thirdBatting = enforceFollowOn ? batSecond : batFirst;
  const thirdBowling = otherTeam(home, away, thirdBatting.id);

  let declareAt: number | null = null;
  if (thirdBatting.id === batFirst.id) {
    const lead = firstTotal - secondTotal;
    const needed = DECLARE_LEAD - lead;
    declareAt = needed > 0 ? needed : null;
  }

  const third = play(thirdBatting, thirdBowling, {
    maxOvers: remainingOvers(),
    declareAt,
  });
  ballsUsed += third.state.legalBalls;

  if (enforceFollowOn && third.state.closed) {
    const thirdTotal = aggregate.get(batSecond.id) ?? 0;
    if (thirdTotal < firstTotal) {
      const lead = firstTotal - thirdTotal;
      return {
        format: spec.id,
        toss,
        innings,
        winnerTeamId: batFirst.id,
        tied: false,
        drawn: false,
        resultText: `${batFirst.name} won by an innings and ${lead} run${lead === 1 ? '' : 's'}`,
      };
    }
  }

  if (remainingOvers() <= 0) return draw();

  const fourthBatting = enforceFollowOn ? batFirst : batSecond;
  const fourthBowling = otherTeam(home, away, fourthBatting.id);
  const rawTarget =
    (aggregate.get(fourthBowling.id) ?? 0) - (aggregate.get(fourthBatting.id) ?? 0) + 1;
  const target = Math.max(1, rawTarget);
  const fourth = play(fourthBatting, fourthBowling, {
    target,
    maxOvers: remainingOvers(),
  });

  if (fourth.state.runs >= target) {
    return {
      format: spec.id,
      toss,
      innings,
      winnerTeamId: fourthBatting.id,
      tied: false,
      drawn: false,
      resultText: winByWickets(fourthBatting, fourth.state.wickets),
    };
  }
  if (fourth.state.runs === target - 1 && fourth.state.closed) {
    return {
      format: spec.id,
      toss,
      innings,
      winnerTeamId: null,
      tied: true,
      drawn: false,
      resultText: 'Match tied',
    };
  }
  if (fourth.state.closed) {
    return {
      format: spec.id,
      toss,
      innings,
      winnerTeamId: fourthBowling.id,
      tied: false,
      drawn: false,
      resultText: winByRuns(fourthBowling, target - 1 - fourth.state.runs),
    };
  }
  return draw();
}
