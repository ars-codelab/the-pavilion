import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { FORMATS } from '../src/formats';
import { applyDelivery, createInningsState, isInningsComplete } from '../src/match';
import type { DismissalKind, DismissedEnd, ExtraKind, ResolvedDelivery } from '../src/types';

const ORDER = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'];

function innings() {
  return createInningsState({ battingTeamId: 'A', bowlingTeamId: 'B', battingOrder: ORDER });
}

const arbDelivery: fc.Arbitrary<ResolvedDelivery> = fc.record({
  runsOffBat: fc.constantFrom(0, 1, 2, 3, 4, 5, 6),
  extra: fc.option(
    fc.record({
      kind: fc.constantFrom<ExtraKind>('wide', 'noball', 'bye', 'legbye'),
      runs: fc.integer({ min: 0, max: 4 }),
    }),
    { nil: null },
  ),
  wicket: fc.option(
    fc.record({
      kind: fc.constantFrom<DismissalKind>(
        'bowled',
        'caught',
        'lbw',
        'run-out',
        'stumped',
        'hit-wicket',
      ),
      batter: fc.constantFrom<DismissedEnd>('striker', 'non-striker'),
    }),
    { nil: null },
  ),
});

describe('applyDelivery laws', () => {
  it('increments legal balls only for legal deliveries', () => {
    let state = innings();
    state = applyDelivery(
      state,
      { runsOffBat: 0, extra: { kind: 'wide', runs: 0 }, wicket: null },
      6,
    );
    expect(state.legalBalls).toBe(0);
    state = applyDelivery(
      state,
      { runsOffBat: 0, extra: { kind: 'noball', runs: 0 }, wicket: null },
      6,
    );
    expect(state.legalBalls).toBe(0);
    state = applyDelivery(
      state,
      { runsOffBat: 0, extra: { kind: 'bye', runs: 2 }, wicket: null },
      6,
    );
    expect(state.legalBalls).toBe(1);
    state = applyDelivery(state, { runsOffBat: 3, extra: null, wicket: null }, 6);
    expect(state.legalBalls).toBe(2);
  });

  it('adds the mandatory run for wides and no-balls', () => {
    let state = innings();
    state = applyDelivery(
      state,
      { runsOffBat: 0, extra: { kind: 'wide', runs: 0 }, wicket: null },
      6,
    );
    expect(state.runs).toBe(1);
    state = applyDelivery(
      state,
      { runsOffBat: 0, extra: { kind: 'noball', runs: 2 }, wicket: null },
      6,
    );
    expect(state.runs).toBe(4);
  });

  it('does not credit byes to the batter', () => {
    let state = innings();
    state = applyDelivery(
      state,
      { runsOffBat: 0, extra: { kind: 'legbye', runs: 3 }, wicket: null },
      6,
    );
    expect(state.runs).toBe(3);
    expect(state.batters[0].runs).toBe(0);
    expect(state.batters[0].balls).toBe(1);
  });

  it('rotates strike on odd runs', () => {
    let state = innings();
    expect(state.striker).toBe(0);
    state = applyDelivery(state, { runsOffBat: 1, extra: null, wicket: null }, 6);
    expect(state.striker).toBe(1);
    state = applyDelivery(state, { runsOffBat: 2, extra: null, wicket: null }, 6);
    expect(state.striker).toBe(1);
  });

  it('rotates strike on odd byes', () => {
    let state = innings();
    state = applyDelivery(
      state,
      { runsOffBat: 0, extra: { kind: 'bye', runs: 1 }, wicket: null },
      6,
    );
    expect(state.striker).toBe(1);
  });

  it('swaps strike at the end of an over', () => {
    let state = innings();
    for (let i = 0; i < 6; i++) {
      state = applyDelivery(state, { runsOffBat: 0, extra: null, wicket: null }, 6);
    }
    expect(state.legalBalls).toBe(6);
    expect(state.striker).toBe(1);
  });

  it('closes the innings on the tenth wicket', () => {
    let state = innings();
    for (let i = 0; i < 10; i++) {
      state = applyDelivery(
        state,
        { runsOffBat: 0, extra: null, wicket: { kind: 'bowled', batter: 'striker' } },
        6,
      );
    }
    expect(state.wickets).toBe(10);
    expect(state.closed).toBe(true);
    expect(isInningsComplete(state, FORMATS.test)).toBe(true);
  });

  it('ends a limited-overs innings at the over cap', () => {
    let state = innings();
    const balls = FORMATS.t20.maxOversPerInnings;
    if (balls === null) throw new Error('t20 must cap overs');
    for (let i = 0; i < balls * FORMATS.t20.ballsPerOver; i++) {
      state = applyDelivery(state, { runsOffBat: 1, extra: null, wicket: null }, 6);
    }
    expect(isInningsComplete(state, FORMATS.t20)).toBe(true);
  });

  it('never mutates the input state', () => {
    const state = innings();
    const before = JSON.stringify(state);
    applyDelivery(state, { runsOffBat: 4, extra: null, wicket: null }, 6);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('maintains invariants for arbitrary delivery sequences', () => {
    fc.assert(
      fc.property(fc.array(arbDelivery, { maxLength: 120 }), (deliveries) => {
        let state = innings();
        for (const delivery of deliveries) {
          state = applyDelivery(state, delivery, 6);
          expect(state.runs).toBeGreaterThanOrEqual(0);
          expect(state.wickets).toBeGreaterThanOrEqual(0);
          expect(state.wickets).toBeLessThanOrEqual(10);
          expect(state.legalBalls).toBeGreaterThanOrEqual(0);
          expect(state.batters[0].balls).toBeGreaterThanOrEqual(0);
          expect(state.batters[1].balls).toBeGreaterThanOrEqual(0);
          if (state.wickets >= 10) expect(state.closed).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});
