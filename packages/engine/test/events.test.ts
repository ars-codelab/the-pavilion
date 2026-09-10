import { describe, expect, it } from 'vitest';
import { ballLabel } from '../src/events';
import type { BallEvent } from '../src/events';
import { FORMATS } from '../src/formats';
import { simulateMatch } from '../src/match-sim';
import { Random } from '../src/rng';
import { makeTeam } from './helpers';

const HOME = makeTeam('HOM', [50, 48, 46, 44, 42, 40, 36, 28, 18, 12, 8], [52, 50, 46, 44, 36]);
const AWAY = makeTeam('AWY', [44, 42, 40, 38, 36, 34, 30, 24, 16, 11, 7], [46, 44, 42, 38, 32]);

function simulate(seed: number | string, events: BallEvent[]) {
  return simulateMatch(new Random(seed), {
    spec: FORMATS.t20,
    home: HOME,
    away: AWAY,
    events,
  });
}

describe('ball-by-ball events', () => {
  it('records every delivery and matches the final score per innings', () => {
    const events: BallEvent[] = [];
    const result = simulate(5, events);
    expect(events.length).toBeGreaterThan(0);

    const byInnings = new Map<number, BallEvent[]>();
    for (const event of events) {
      const list = byInnings.get(event.inningsIndex) ?? [];
      list.push(event);
      byInnings.set(event.inningsIndex, list);
    }
    expect(byInnings.size).toBe(result.innings.length);

    for (const [index, list] of byInnings) {
      const last = list[list.length - 1];
      const innings = result.innings[index];
      expect(last?.score).toBe(innings?.state.runs);
      expect(last?.wickets).toBe(innings?.state.wickets);
      expect(last?.battingTeamId).toBe(innings?.battingTeamId);
    }
  });

  it('is deterministic', () => {
    const a: BallEvent[] = [];
    const b: BallEvent[] = [];
    simulate('evt', a);
    simulate('evt', b);
    expect(a).toEqual(b);
  });

  it('labels deliveries', () => {
    const events: BallEvent[] = [];
    simulate(9, events);
    const wicket = events.find((event) => event.wicketKind !== null);
    const boundary = events.find((event) => event.runsOffBat === 4);
    const dot = events.find(
      (event) => event.runsOffBat === 0 && event.extraKind === null && event.wicketKind === null,
    );
    if (wicket !== undefined) expect(ballLabel(wicket)).toBe('W');
    if (boundary !== undefined) expect(ballLabel(boundary)).toBe('4');
    if (dot !== undefined) expect(ballLabel(dot)).toBe('0');
  });
});
