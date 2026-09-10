export interface Attributes {
  batting: number;
  bowling: number;
  fielding: number;
}

export interface DevelopmentState {
  age: number;
  peakAge: number;
  potential: Attributes;
  ability: Attributes;
  /** 0-100 with 50 neutral. */
  form: number;
  /** 0-100 team spirit / confidence. */
  morale: number;
  /** 0-100 physical condition. */
  fitness: number;
  /** Career appearances (first-class equivalent). */
  experience: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function developAttribute(
  current: number,
  potential: number,
  age: number,
  peakAge: number,
): number {
  if (age < peakAge) {
    const gap = potential - current;
    if (gap <= 0) return clamp(current);
    return clamp(current + gap * 0.12);
  }
  const decline = 0.4 + (age - peakAge) * 0.3;
  return clamp(current - decline);
}

/** Advance a player by one year, moving ability toward potential then into decline. */
export function developYear(state: DevelopmentState): DevelopmentState {
  return {
    ...state,
    age: state.age + 1,
    ability: {
      batting: developAttribute(
        state.ability.batting,
        state.potential.batting,
        state.age,
        state.peakAge,
      ),
      bowling: developAttribute(
        state.ability.bowling,
        state.potential.bowling,
        state.age,
        state.peakAge,
      ),
      fielding: developAttribute(
        state.ability.fielding,
        state.potential.fielding,
        state.age,
        state.peakAge,
      ),
    },
  };
}

/** Update form, morale and fitness after an appearance. `performance` is 0-100. */
export function applyAppearance(
  state: DevelopmentState,
  performance: number,
  workload: number,
  won: boolean,
): DevelopmentState {
  return {
    ...state,
    experience: state.experience + 1,
    form: clamp(state.form + (clamp(performance) - 50) * 0.3),
    morale: clamp(state.morale + (won ? 3 : -2) + (clamp(performance) - 50) * 0.05),
    fitness: clamp(state.fitness - workload),
  };
}

/** Recover fitness and let form drift toward neutral over inactive days. */
export function restDays(state: DevelopmentState, days: number): DevelopmentState {
  const recovered = state.fitness + days * 6;
  const formDrift = (50 - state.form) * Math.min(0.5, days * 0.02);
  return {
    ...state,
    fitness: clamp(recovered),
    form: clamp(state.form + formDrift),
  };
}

export function injuryRisk(state: DevelopmentState): number {
  const ageRisk = Math.max(0, state.age - 26) * 0.004;
  const fitnessRisk = Math.max(0, 70 - state.fitness) * 0.003;
  return Math.min(0.35, ageRisk + fitnessRisk);
}

export function isRetired(state: DevelopmentState): boolean {
  return (
    state.age >= 40 || (state.age >= 34 && state.ability.batting < 20 && state.ability.bowling < 20)
  );
}
