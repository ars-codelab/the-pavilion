import { describe, expect, it } from 'vitest';
import { Random } from '@pavilion/engine';
import {
  acceptJob,
  advanceYear,
  canAccept,
  createCoach,
  createPlayerCareer,
  generateJobOffers,
  recordAppearance,
  recordResult,
  settleSeason,
} from '../src/index';

const TEAMS = [
  { id: 'eng', name: 'England' },
  { id: 'ind', name: 'India' },
  { id: 'aus', name: 'Australia' },
  { id: 'rsa', name: 'South Africa' },
];

describe('coach career', () => {
  it('rewards wins and punishes losses', () => {
    const coach = createCoach('c1', 'Alex', 'eng', new Random(1), '2026-08-31');
    const won = recordResult(coach, 'W');
    expect(won.boardConfidence).toBeGreaterThan(coach.boardConfidence);
    expect(won.reputation).toBeGreaterThan(coach.reputation);
    const lost = recordResult(coach, 'L');
    expect(lost.boardConfidence).toBeLessThan(coach.boardConfidence);
  });

  it('credits win objectives on victory', () => {
    const coach = createCoach('c1', 'Alex', 'eng', new Random(2), '2026-08-31');
    const winObjective = coach.objectives.find((objective) => objective.kind === 'win-matches');
    expect(winObjective).toBeDefined();
    const after = recordResult(coach, 'W');
    const updated = after.objectives.find((objective) => objective.kind === 'win-matches');
    expect(updated?.progress).toBe(1);
  });

  it('offers only eligible jobs', () => {
    const coach = createCoach('c1', 'Alex', 'eng', new Random(3), '2026-08-31');
    const offers = generateJobOffers(new Random(3), coach, TEAMS, 3);
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((offer) => offer.teamId)).size).toBe(3);
    expect(offers.every((offer) => offer.teamId !== coach.teamId)).toBe(true);

    const easy = { teamId: 'ind', teamName: 'India', reputationRequired: 30, salary: 160 };
    const hard = { teamId: 'aus', teamName: 'Australia', reputationRequired: 90, salary: 280 };
    expect(canAccept(coach, easy)).toBe(true);
    expect(canAccept(coach, hard)).toBe(false);
    expect(() => acceptJob(coach, hard, new Random(1), '2027-08-31')).toThrow();

    const moved = acceptJob(coach, easy, new Random(1), '2027-08-31');
    expect(moved.teamId).toBe('ind');
  });

  it('fails objectives after the deadline', () => {
    const coach = createCoach('c1', 'Alex', 'eng', new Random(4), '2026-08-31');
    const settled = settleSeason(coach.objectives, true);
    expect(settled.every((objective) => objective.failed)).toBe(true);
  });
});

describe('player career', () => {
  const potential = { batting: 80, bowling: 20, fielding: 60 };

  it('tracks milestones across appearances', () => {
    let career = createPlayerCareer('p1', 'Sam', 'eng', potential, 22);
    career = recordAppearance(career, {
      runs: 120,
      wickets: 0,
      won: true,
      workload: 5,
      performance: 90,
    });
    career = recordAppearance(career, {
      runs: 60,
      wickets: 0,
      won: false,
      workload: 5,
      performance: 65,
    });
    career = recordAppearance(career, {
      runs: 0,
      wickets: 6,
      won: true,
      workload: 30,
      performance: 95,
    });
    expect(career.matches).toBe(3);
    expect(career.runs).toBe(180);
    expect(career.hundreds).toBe(1);
    expect(career.fifties).toBe(1);
    expect(career.fiveWicketHauls).toBe(1);
    expect(career.development.form).toBeGreaterThan(50);
  });

  it('develops then declines with age', () => {
    let career = createPlayerCareer('p1', 'Sam', 'eng', potential, 22);
    const start = career.development.ability.batting;
    for (let i = 0; i < 6; i += 1) career = advanceYear(career);
    expect(career.development.ability.batting).toBeGreaterThan(start);

    const peak = career.development.ability.batting;
    for (let i = 0; i < 8; i += 1) career = advanceYear(career);
    expect(career.development.ability.batting).toBeLessThan(peak);
  });

  it('retires at the age limit', () => {
    let career = createPlayerCareer('p1', 'Sam', 'eng', potential, 39);
    career = advanceYear(career);
    expect(career.retired).toBe(true);
  });
});
