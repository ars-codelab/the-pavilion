import { describe, expect, it } from 'vitest';
import { parseCricsheetMatch, summariseMatches } from '../src/calibration';
import fixture from './fixtures/cricsheet-mini.json';

describe('cricsheet calibration', () => {
  it('parses a match and reproduces known aggregates', () => {
    const match = parseCricsheetMatch(fixture);
    expect(match.teams).toEqual(['Alpha', 'Bravo']);
    expect(match.matchType).toBe('Test');
    expect(match.innings).toHaveLength(1);

    const innings = match.innings[0];
    if (innings === undefined) throw new Error('expected an innings');
    expect(innings.runs).toBe(12);
    expect(innings.wickets).toBe(1);
    expect(innings.legalBalls).toBe(8);
    expect(innings.fours).toBe(1);
    expect(innings.sixes).toBe(1);
    expect(innings.wides).toBe(1);
  });

  it('summarises matches into distributions', () => {
    const summary = summariseMatches([parseCricsheetMatch(fixture)]);
    expect(summary.matches).toBe(1);
    expect(summary.innings).toBe(1);
    expect(summary.runsPerInnings).toBeCloseTo(12);
    expect(summary.wicketsPerInnings).toBeCloseTo(1);
    expect(summary.runsPerOver).toBeCloseTo(12 / (8 / 6));
  });

  it('rejects malformed input', () => {
    expect(() => parseCricsheetMatch(null)).toThrow();
    expect(() => parseCricsheetMatch({})).toThrow();
    expect(() => parseCricsheetMatch({ info: {} })).toThrow();
  });
});
