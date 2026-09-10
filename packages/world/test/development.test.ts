import { describe, expect, it } from 'vitest';
import { applyAppearance, developYear, injuryRisk, isRetired, restDays } from '../src/development';
import type { DevelopmentState } from '../src/development';

function player(overrides: Partial<DevelopmentState> = {}): DevelopmentState {
  return {
    age: 22,
    peakAge: 28,
    potential: { batting: 80, bowling: 20, fielding: 60 },
    ability: { batting: 50, bowling: 10, fielding: 40 },
    form: 50,
    morale: 60,
    fitness: 100,
    experience: 0,
    ...overrides,
  };
}

describe('development', () => {
  it('moves ability toward potential before the peak', () => {
    const next = developYear(player());
    expect(next.ability.batting).toBeGreaterThan(50);
    expect(next.ability.batting).toBeLessThan(80);
    expect(next.age).toBe(23);
  });

  it('never exceeds potential before the peak', () => {
    let state = player();
    for (let i = 0; i < 20; i += 1) state = developYear(state);
    expect(state.ability.batting).toBeLessThanOrEqual(80);
  });

  it('declines after the peak', () => {
    const next = developYear(
      player({ age: 33, ability: { batting: 75, bowling: 15, fielding: 50 } }),
    );
    expect(next.ability.batting).toBeLessThan(75);
  });

  it('recovers fitness and drifts form with rest', () => {
    const tired = player({ fitness: 40, form: 80 });
    const rested = restDays(tired, 5);
    expect(rested.fitness).toBeGreaterThan(40);
    expect(rested.fitness).toBeLessThanOrEqual(100);
    expect(rested.form).toBeLessThan(80);
  });

  it('updates form, morale and fitness after an appearance', () => {
    const after = applyAppearance(player({ fitness: 90 }), 80, 25, true);
    expect(after.experience).toBe(1);
    expect(after.form).toBeGreaterThan(50);
    expect(after.fitness).toBe(65);
    expect(after.morale).toBeGreaterThan(60);
  });

  it('raises injury risk with age and fatigue', () => {
    expect(injuryRisk(player({ age: 35, fitness: 40 }))).toBeGreaterThan(
      injuryRisk(player({ age: 22, fitness: 100 })),
    );
  });

  it('retires players at the limit', () => {
    expect(isRetired(player({ age: 41 }))).toBe(true);
    expect(isRetired(player({ age: 25 }))).toBe(false);
  });
});
