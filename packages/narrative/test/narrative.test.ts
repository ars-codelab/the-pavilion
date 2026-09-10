import { describe, expect, it } from 'vitest';
import { Random } from '@pavilion/engine';
import { applyEffects, matchesConditions, NarrativeEngine } from '../src/engine';
import { EVENTS } from '../src/events';
import { generateHeadlines } from '../src/headlines';
import { generatePressConference } from '../src/press';
import type { NarrativeContext } from '../src/types';

function context(overrides: Partial<NarrativeContext> = {}): NarrativeContext {
  return {
    teamName: 'Test XI',
    matchesPlayed: 10,
    recentResults: ['W', 'L'],
    form: 50,
    morale: 50,
    boardConfidence: 50,
    reputation: 50,
    starPlayerName: 'Star',
    starPlayerForm: 50,
    ...overrides,
  };
}

describe('narrative conditions and effects', () => {
  it('evaluates declarative conditions', () => {
    expect(matchesConditions(context({ form: 70 }), { minForm: 60 })).toBe(true);
    expect(matchesConditions(context({ form: 40 }), { minForm: 60 })).toBe(false);
    expect(matchesConditions(context({ recentResults: ['W', 'L'] }), { lastResult: 'L' })).toBe(
      true,
    );
    expect(matchesConditions(context({ recentResults: ['W', 'L'] }), { lastResult: 'W' })).toBe(
      false,
    );
  });

  it('applies and clamps effects', () => {
    const updated = applyEffects(context({ morale: 98 }), { morale: 5, reputation: -5 });
    expect(updated.morale).toBe(100);
    expect(updated.reputation).toBe(45);
  });
});

describe('NarrativeEngine', () => {
  it('respects per-event cooldowns', () => {
    const engine = new NarrativeEngine(EVENTS, new Random(1));
    engine.tick();
    const first = engine.draw(context({ morale: 40, boardConfidence: 40 }));
    expect(first).not.toBeNull();
    if (first === null) return;
    engine.tick();
    const next = engine.eligible(context({ morale: 40, boardConfidence: 40 }));
    expect(next.map((event) => event.id)).not.toContain(first.id);
  });

  it('is deterministic for a seed', () => {
    const draw = (seed: number) => {
      const engine = new NarrativeEngine(EVENTS, new Random(seed));
      const ids: (string | null)[] = [];
      for (let i = 0; i < 6; i += 1) {
        engine.tick();
        ids.push(engine.draw(context({ morale: 45, form: 65, boardConfidence: 45 }))?.id ?? null);
      }
      return ids;
    };
    expect(draw(7)).toEqual(draw(7));
  });
});

describe('press and headlines', () => {
  it('generates press questions with toned options', () => {
    const questions = generatePressConference(new Random(2), context(), 3);
    expect(questions).toHaveLength(3);
    for (const question of questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      for (const option of question.options) {
        expect(['positive', 'neutral', 'aggressive', 'defensive']).toContain(option.tone);
      }
    }
  });

  it('sets headline tone from team form', () => {
    const positive = generateHeadlines(new Random(3), context({ form: 80 }), 3);
    expect(positive.every((headline) => headline.tone === 'positive')).toBe(true);
    const negative = generateHeadlines(new Random(3), context({ form: 20 }), 3);
    expect(negative.every((headline) => headline.tone === 'negative')).toBe(true);
  });
});
