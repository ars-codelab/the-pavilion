import { describe, expect, it } from 'vitest';
import { expectedScore, rankTeams, updatePair } from '../src/rankings';
import type { RatingSnapshot } from '../src/rankings';

function rating(id: string, value: number, matches = 20): RatingSnapshot {
  return { id, rating: value, matches };
}

describe('rankings', () => {
  it('gives equal ratings a 50% expectation', () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
    expect(expectedScore(1700, 1500)).toBeGreaterThan(0.5);
  });

  it('moves the winner up and the loser down', () => {
    const result = updatePair(rating('a', 1500), rating('b', 1500));
    expect(result.winner.rating).toBeGreaterThan(1500);
    expect(result.loser.rating).toBeLessThan(1500);
    expect(result.winner.matches).toBe(21);
  });

  it('splits rating on a draw', () => {
    const result = updatePair(rating('a', 1500), rating('b', 1500), true);
    expect(result.winner.rating).toBeCloseTo(1500);
    expect(result.loser.rating).toBeCloseTo(1500);
  });

  it('ranks by descending rating', () => {
    const ranked = rankTeams([rating('a', 1400), rating('b', 1700), rating('c', 1550)]);
    expect(ranked.map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
  });
});
