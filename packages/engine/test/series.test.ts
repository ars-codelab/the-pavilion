import { describe, expect, it } from 'vitest';
import { FORMATS } from '../src/formats';
import { Random } from '../src/rng';
import { seriesPlayerStats, simulateSeries } from '../src/series';
import { makeTeam } from './helpers';

const HOME = makeTeam('HOM', [50, 48, 46, 44, 42, 40, 36, 28, 18, 12, 8], [52, 50, 46, 44, 36]);
const AWAY = makeTeam('AWY', [44, 42, 40, 38, 36, 34, 30, 24, 16, 11, 7], [46, 44, 42, 38, 32]);

function series(seed: number | string, matches = 5) {
  return simulateSeries(new Random(seed), {
    spec: FORMATS.test,
    home: HOME,
    away: AWAY,
    matches,
  });
}

describe('simulateSeries', () => {
  it('plays the requested number of matches and tallies the scoreline', () => {
    const result = series(1);
    expect(result.matches).toHaveLength(5);
    expect(result.homeWins + result.awayWins + result.draws + result.ties).toBe(5);
    expect(result.summary).toMatch(/won the series|Series drawn/);
  });

  it('is deterministic for a seed', () => {
    const a = series('s');
    const b = series('s');
    expect(a.summary).toBe(b.summary);
    expect(a.matches.map((match) => match.resultText)).toEqual(
      b.matches.map((match) => match.resultText),
    );
  });

  it('aggregates player statistics across the series', () => {
    const result = series(5, 3);
    const stats = seriesPlayerStats(result);
    expect(stats.length).toBeGreaterThan(20);
    for (const entry of stats) {
      expect(entry.runs).toBeGreaterThanOrEqual(0);
      expect(entry.wickets).toBeGreaterThanOrEqual(0);
      expect(entry.legalBalls).toBeGreaterThanOrEqual(0);
    }
    const homeBatting = stats.filter((entry) => entry.teamId === HOME.id);
    const totalRuns = homeBatting.reduce((sum, entry) => sum + entry.runs, 0);
    expect(totalRuns).toBeGreaterThan(0);
  });
});
