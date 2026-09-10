import { describe, expect, it } from 'vitest';
import { FORMATS } from '../src/formats';
import { simulateMatch } from '../src/match-sim';
import { Random } from '../src/rng';
import type { FormatId } from '../src/types';
import { makeTeam } from './helpers';

const STRONG = makeTeam('STR', [52, 50, 48, 46, 44, 42, 38, 30, 20, 12, 8], [55, 52, 48, 45, 40]);
const WEAK = makeTeam('WEA', [32, 30, 29, 28, 27, 26, 24, 20, 14, 10, 7], [38, 36, 34, 32, 28]);

function play(format: FormatId, seed: number | string) {
  return simulateMatch(new Random(seed), {
    spec: FORMATS[format],
    home: STRONG,
    away: WEAK,
  });
}

describe('simulateMatch', () => {
  it('completes a T20 with a valid result', () => {
    const result = play('t20', 1);
    expect(result.innings).toHaveLength(2);
    expect(result.resultText).toMatch(/won by|tied/);
    for (const innings of result.innings) {
      expect(innings.state.legalBalls).toBeLessThanOrEqual(120);
      expect(innings.state.wickets).toBeLessThanOrEqual(10);
    }
  });

  it('completes an ODI with a valid result', () => {
    const result = play('odi', 2);
    expect(result.innings).toHaveLength(2);
    expect(result.resultText).toMatch(/won by|tied/);
    for (const innings of result.innings) {
      expect(innings.state.legalBalls).toBeLessThanOrEqual(300);
    }
  });

  it('completes a Test with two to four innings and a valid result', () => {
    const result = play('test', 3);
    expect(result.innings.length).toBeGreaterThanOrEqual(2);
    expect(result.innings.length).toBeLessThanOrEqual(4);
    expect(result.resultText).toMatch(/won by|drawn|tied/);
  });

  it('is deterministic for a given seed', () => {
    const a = play('odi', 'seed-x');
    const b = play('odi', 'seed-x');
    expect(a.resultText).toBe(b.resultText);
    expect(a.innings.map((innings) => innings.state.runs)).toEqual(
      b.innings.map((innings) => innings.state.runs),
    );
  });

  it('never exceeds the Test overs budget', () => {
    for (let seed = 0; seed < 40; seed++) {
      const result = play('test', seed);
      const balls = result.innings.reduce((sum, innings) => sum + innings.state.legalBalls, 0);
      expect(balls).toBeLessThanOrEqual(450 * 6);
    }
  });

  it('respects the Test time budget for even sides', () => {
    const a = makeTeam('EQA', [40, 38, 37, 36, 35, 34, 30, 26, 18, 12, 8], [42, 40, 38, 36, 32]);
    const b = makeTeam('EQB', [40, 38, 37, 36, 35, 34, 30, 26, 18, 12, 8], [42, 40, 38, 36, 32]);
    for (let seed = 0; seed < 100; seed++) {
      const result = simulateMatch(new Random(seed), { spec: FORMATS.test, home: a, away: b });
      const balls = result.innings.reduce((sum, innings) => sum + innings.state.legalBalls, 0);
      expect(balls).toBeLessThanOrEqual(450 * 6);
      expect(result.resultText).toMatch(/won by|drawn|tied/);
    }
  });

  it('lets stronger teams win more often', () => {
    let strongWins = 0;
    let decided = 0;
    for (let seed = 0; seed < 300; seed++) {
      const result = play('t20', seed);
      if (result.drawn || result.tied) continue;
      decided += 1;
      if (result.winnerTeamId === STRONG.id) strongWins += 1;
    }
    expect(decided).toBeGreaterThan(250);
    expect(strongWins / decided).toBeGreaterThan(0.65);
  });
});
