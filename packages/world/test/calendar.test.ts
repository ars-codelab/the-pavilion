import { describe, expect, it } from 'vitest';
import {
  addDays,
  compareDates,
  daysBetween,
  formatDate,
  fromEpochDay,
  isValidDate,
  makeDate,
  seasonOf,
  toEpochDay,
} from '../src/calendar';

describe('calendar', () => {
  it('validates dates including leap years', () => {
    expect(isValidDate({ year: 2024, month: 2, day: 29 })).toBe(true);
    expect(isValidDate({ year: 2023, month: 2, day: 29 })).toBe(false);
    expect(() => makeDate(2023, 13, 1)).toThrow();
  });

  it('adds days across month, year and leap boundaries', () => {
    expect(formatDate(addDays(makeDate(2024, 2, 28), 1))).toBe('2024-02-29');
    expect(formatDate(addDays(makeDate(2024, 2, 29), 1))).toBe('2024-03-01');
    expect(formatDate(addDays(makeDate(2023, 12, 31), 1))).toBe('2024-01-01');
    expect(formatDate(addDays(makeDate(2024, 1, 1), -1))).toBe('2023-12-31');
  });

  it('round-trips epoch days', () => {
    const date = makeDate(1999, 7, 15);
    expect(formatDate(fromEpochDay(toEpochDay(date)))).toBe('1999-07-15');
  });

  it('measures differences and ordering', () => {
    const a = makeDate(2024, 1, 1);
    const b = makeDate(2024, 3, 1);
    expect(daysBetween(a, b)).toBe(60);
    expect(compareDates(a, b)).toBeLessThan(0);
  });

  it('derives the season label', () => {
    expect(seasonOf(makeDate(2024, 10, 1))).toBe(2024);
    expect(seasonOf(makeDate(2025, 2, 1))).toBe(2024);
  });
});
