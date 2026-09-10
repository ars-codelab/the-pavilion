import type { Random } from '@pavilion/engine';
import type { Objective, ObjectiveKind } from './types';

interface Template {
  kind: ObjectiveKind;
  describe: (target: number) => string;
  min: number;
  max: number;
}

const TEMPLATES: Template[] = [
  { kind: 'win-matches', describe: (target) => `Win at least ${target} matches`, min: 5, max: 8 },
  { kind: 'win-series', describe: (target) => `Win ${target} series`, min: 1, max: 2 },
  {
    kind: 'develop-youth',
    describe: (target) => `Give ${target} appearances to young players`,
    min: 3,
    max: 6,
  },
];

export function generateObjectives(random: Random, deadline: string): Objective[] {
  return TEMPLATES.map((template, index) => {
    const target = random.int(template.min, template.max);
    return {
      id: `${template.kind}-${index + 1}`,
      kind: template.kind,
      description: template.describe(target),
      target,
      progress: 0,
      deadline,
      met: false,
      failed: false,
    };
  });
}

export function recordObjectiveProgress(
  objectives: Objective[],
  kind: ObjectiveKind,
  amount = 1,
): Objective[] {
  return objectives.map((objective) => {
    if (objective.kind !== kind) return objective;
    const progress = objective.progress + amount;
    return { ...objective, progress, met: progress >= objective.target };
  });
}

export function settleSeason(objectives: Objective[], deadlinePassed: boolean): Objective[] {
  return objectives.map((objective) => ({
    ...objective,
    failed: deadlinePassed && !objective.met,
  }));
}
