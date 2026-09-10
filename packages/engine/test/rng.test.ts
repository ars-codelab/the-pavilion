import { describe, expect, it } from 'vitest';
import { Random } from '../src/rng';

describe('Random', () => {
  it('is deterministic for the same seed', () => {
    const a = new Random('pavilion');
    const b = new Random('pavilion');
    const sequenceA = Array.from({ length: 32 }, () => a.next());
    const sequenceB = Array.from({ length: 32 }, () => b.next());
    expect(sequenceA).toEqual(sequenceB);
  });

  it('differs for different seeds', () => {
    const a = new Random('one');
    const b = new Random('two');
    expect(a.next()).not.toBe(b.next());
  });

  it('returns floats in [0, 1)', () => {
    const random = new Random(42);
    for (let i = 0; i < 1000; i++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('keeps int within inclusive bounds', () => {
    const random = new Random(7);
    for (let i = 0; i < 1000; i++) {
      const value = random.int(3, 9);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(9);
    }
  });

  it('pick always returns an element', () => {
    const random = new Random('pick');
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) {
      expect(items).toContain(random.pick(items));
    }
  });

  it('resumes exactly from saved state', () => {
    const random = new Random('save');
    random.next();
    const state = random.getState();
    const expected = Array.from({ length: 16 }, () => random.next());
    random.setState(state);
    const replay = Array.from({ length: 16 }, () => random.next());
    expect(replay).toEqual(expected);
  });

  it('forks deterministically', () => {
    const forkA = new Random('root').fork('batting');
    const forkB = new Random('root').fork('batting');
    expect(Array.from({ length: 10 }, () => forkA.next())).toEqual(
      Array.from({ length: 10 }, () => forkB.next()),
    );
  });

  it('forks to independent streams per label', () => {
    const batting = new Random('root').fork('batting').next();
    const bowling = new Random('root').fork('bowling').next();
    expect(batting).not.toBe(bowling);
  });

  it('honours zero weights', () => {
    const random = new Random('weighted');
    const value = random.weighted([
      { value: 'never', weight: 0 },
      { value: 'always', weight: 5 },
    ]);
    expect(value).toBe('always');
  });
});
