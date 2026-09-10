import { describe, expect, it } from 'vitest';
import { fixturesForTeam, roundRobin } from '../src/competition';

const SIX = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('competition fixtures', () => {
  it('schedules a double round robin', () => {
    const fixtures = roundRobin(SIX, true);
    expect(fixtures).toHaveLength(30);
    for (const team of SIX) {
      const teamFixtures = fixturesForTeam(fixtures, team);
      expect(teamFixtures).toHaveLength(10);
      const home = teamFixtures.filter((fixture) => fixture.homeId === team).length;
      expect(home).toBe(5);
    }
  });

  it('never schedules a team twice in a round', () => {
    const fixtures = roundRobin(SIX, true);
    const byRound = new Map<number, string[]>();
    for (const fixture of fixtures) {
      const teams = byRound.get(fixture.round) ?? [];
      teams.push(fixture.homeId, fixture.awayId);
      byRound.set(fixture.round, teams);
    }
    for (const teams of byRound.values()) {
      expect(new Set(teams).size).toBe(teams.length);
    }
  });

  it('gives odd team counts a bye each round', () => {
    const fixtures = roundRobin(['a', 'b', 'c', 'd', 'e'], false);
    for (const team of ['a', 'b', 'c', 'd', 'e']) {
      expect(fixturesForTeam(fixtures, team)).toHaveLength(4);
    }
  });
});
