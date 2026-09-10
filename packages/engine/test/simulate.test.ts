import { describe, expect, it } from 'vitest';
import { FORMATS } from '../src/formats';
import { Random } from '../src/rng';
import { simulateInnings } from '../src/simulate';
import type { FormatId } from '../src/types';
import { makeSide } from './helpers';

function simulate(format: FormatId, seed: number | string) {
  const { order, attack } = makeSide('A');
  return simulateInnings(new Random(seed), {
    spec: FORMATS[format],
    battingTeamId: 'A',
    bowlingTeamId: 'B',
    battingOrder: order,
    bowlingAttack: attack,
  });
}

describe('simulateInnings', () => {
  it('completes a T20 innings within the over cap', () => {
    const { state } = simulate('t20', 1);
    expect(state.legalBalls).toBeLessThanOrEqual(20 * 6);
    expect(state.wickets).toBeLessThanOrEqual(10);
    expect(state.runs).toBeGreaterThan(0);
  });

  it('is deterministic for a given seed', () => {
    const a = simulate('odi', 'seed-1');
    const b = simulate('odi', 'seed-1');
    expect(a.state.runs).toBe(b.state.runs);
    expect(a.state.legalBalls).toBe(b.state.legalBalls);
    expect(a.bowlers).toEqual(b.bowlers);
  });

  it('tracks bowler statistics consistently', () => {
    const { state, bowlers } = simulate('t20', 7);
    const totalBowlerBalls = bowlers.reduce((sum, bowler) => sum + bowler.legalBalls, 0);
    expect(totalBowlerBalls).toBe(state.legalBalls);
    expect(bowlers.every((bowler) => bowler.runs >= 0 && bowler.wickets >= 0)).toBe(true);
  });

  it('respects the T20 four-over bowler cap', () => {
    const { bowlers } = simulate('t20', 99);
    for (const bowler of bowlers) expect(bowler.legalBalls).toBeLessThanOrEqual(4 * 6);
  });

  it('attributes wickets separately from bowler figures where appropriate', () => {
    const { state, bowlers } = simulate('test', 5);
    const bowlerWickets = bowlers.reduce((sum, bowler) => sum + bowler.wickets, 0);
    expect(bowlerWickets).toBeLessThanOrEqual(state.wickets);
  });
});
