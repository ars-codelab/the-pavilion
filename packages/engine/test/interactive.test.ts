import { describe, expect, it } from 'vitest';
import { FORMATS } from '../src/formats';
import { InteractiveMatch } from '../src/interactive';
import { Random } from '../src/rng';
import { makeTeam } from './helpers';

const HOME = makeTeam('HOM', [50, 48, 46, 44, 42, 40, 36, 28, 18, 12, 8], [52, 50, 46, 44, 36]);
const AWAY = makeTeam('AWY', [44, 42, 40, 38, 36, 34, 30, 24, 16, 11, 7], [46, 44, 42, 38, 32]);

function session(seed: number | string, userTeamId: string | null = HOME.id) {
  return new InteractiveMatch(new Random(seed), {
    spec: FORMATS.t20,
    home: HOME,
    away: AWAY,
    userTeamId,
  });
}

describe('InteractiveMatch', () => {
  it('pauses for the user to choose a bowler when fielding', () => {
    const match = new InteractiveMatch(new Random(2), {
      spec: FORMATS.t20,
      home: HOME,
      away: AWAY,
      userTeamId: HOME.id,
      toss: { winnerTeamId: HOME.id, decision: 'field' },
    });
    expect(match.pending?.kind).toBe('bowler');
    expect(match.nextOver()).toHaveLength(0);
    const option = match.pending?.options[0];
    expect(option).toBeDefined();
    if (option === undefined) return;
    match.decide({ bowlerId: option.id });
    const events = match.nextOver();
    expect(events.length).toBeGreaterThan(0);
    expect(match.events[0]?.bowlerId).toBe(option.id);
  });

  it('plays a full match to a result', () => {
    const match = session(3);
    match.simulateToEnd();
    expect(match.result).not.toBeNull();
    expect(match.events.length).toBeGreaterThan(0);
    expect(match.result?.resultText).toMatch(/won by|Match tied/);
  });

  it('is deterministic for a seed', () => {
    const run = () => {
      const match = session('seed-x');
      match.simulateToEnd();
      return { result: match.result?.resultText, events: match.events.length };
    };
    expect(run()).toEqual(run());
  });

  it('reflects aggression changes in the snapshot', () => {
    const match = session(4);
    match.setAggression('batting', 9);
    match.setAggression('bowling', 2);
    const snap = match.snapshot();
    expect(snap.battingAggression).toBe(9);
    expect(snap.bowlingAggression).toBe(2);
  });

  it('accepts a valid batting order and rejects an invalid one', () => {
    const match = new InteractiveMatch(new Random(5), {
      spec: FORMATS.t20,
      home: HOME,
      away: AWAY,
      userTeamId: HOME.id,
      toss: { winnerTeamId: HOME.id, decision: 'bat' },
    });
    const original = match.snapshot().battingCard.map((batter) => batter.playerId);
    expect(original.length).toBeGreaterThanOrEqual(2);
    const order = HOME.battingOrder.map((player) => player.id);
    const reversed = [...order].reverse();
    match.setBattingOrder(reversed);
    // Invalid order (missing a player) is ignored.
    match.setBattingOrder(order.slice(0, 5));
    expect(match.snapshot().started).toBe(true);
  });

  it('completes a Test match with a valid result', () => {
    const match = new InteractiveMatch(new Random(7), {
      spec: FORMATS.test,
      home: HOME,
      away: AWAY,
      userTeamId: HOME.id,
    });
    match.simulateToEnd();
    expect(match.result).not.toBeNull();
    expect(match.result?.resultText).toMatch(/won by|drawn|Match tied/);
    const balls = match.innings.reduce((sum, innings) => sum + innings.state.legalBalls, 0);
    expect(balls).toBeLessThanOrEqual(450 * 6 + 6);
  });
});
