import type { Random } from '@pavilion/engine';
import type {
  Effects,
  EventChoice,
  EventConditions,
  NarrativeContext,
  NarrativeEvent,
} from './types';

function clampStat(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function matchesConditions(
  context: NarrativeContext,
  conditions?: EventConditions,
): boolean {
  if (conditions === undefined) return true;
  if (conditions.minMatches !== undefined && context.matchesPlayed < conditions.minMatches)
    return false;
  if (conditions.minMorale !== undefined && context.morale < conditions.minMorale) return false;
  if (conditions.maxMorale !== undefined && context.morale > conditions.maxMorale) return false;
  if (conditions.minForm !== undefined && context.form < conditions.minForm) return false;
  if (conditions.maxForm !== undefined && context.form > conditions.maxForm) return false;
  if (
    conditions.minBoardConfidence !== undefined &&
    context.boardConfidence < conditions.minBoardConfidence
  ) {
    return false;
  }
  if (
    conditions.maxBoardConfidence !== undefined &&
    context.boardConfidence > conditions.maxBoardConfidence
  ) {
    return false;
  }
  if (conditions.minReputation !== undefined && context.reputation < conditions.minReputation) {
    return false;
  }
  if (conditions.maxReputation !== undefined && context.reputation > conditions.maxReputation) {
    return false;
  }
  if (conditions.lastResult !== undefined) {
    const last = context.recentResults[context.recentResults.length - 1];
    if (last !== conditions.lastResult) return false;
  }
  return true;
}

export function applyEffects(context: NarrativeContext, effects: Effects): NarrativeContext {
  return {
    ...context,
    morale: clampStat(context.morale + (effects.morale ?? 0)),
    boardConfidence: clampStat(context.boardConfidence + (effects.boardConfidence ?? 0)),
    reputation: clampStat(context.reputation + (effects.reputation ?? 0)),
    form: clampStat(context.form + (effects.form ?? 0)),
  };
}

export interface NarrativeEngineOptions {
  /** Minimum ticks between two events of the same category. */
  perCategoryCooldown?: number;
}

export class NarrativeEngine {
  private readonly lastFired = new Map<string, number>();
  private readonly lastCategory = new Map<string, number>();
  private clock = 0;

  constructor(
    private readonly events: readonly NarrativeEvent[],
    private readonly random: Random,
    private readonly options: NarrativeEngineOptions = {},
  ) {}

  tick(): number {
    this.clock += 1;
    return this.clock;
  }

  eligible(context: NarrativeContext): NarrativeEvent[] {
    const categoryCooldown = this.options.perCategoryCooldown ?? 2;
    return this.events.filter((event) => {
      if (!matchesConditions(context, event.conditions)) return false;
      const last = this.lastFired.get(event.id);
      if (last !== undefined && this.clock - last < event.cooldownDays) return false;
      const lastCategory = this.lastCategory.get(event.category);
      if (lastCategory !== undefined && this.clock - lastCategory < categoryCooldown) return false;
      return true;
    });
  }

  draw(context: NarrativeContext): NarrativeEvent | null {
    const eligible = this.eligible(context);
    if (eligible.length === 0) return null;
    const chosen = this.random.weighted(
      eligible.map((event) => ({ value: event, weight: Math.max(0.01, event.weight) })),
    );
    this.record(chosen);
    return chosen;
  }

  choose(choice: EventChoice): Effects {
    return choice.effects;
  }

  private record(event: NarrativeEvent): void {
    this.lastFired.set(event.id, this.clock);
    this.lastCategory.set(event.category, this.clock);
  }
}
