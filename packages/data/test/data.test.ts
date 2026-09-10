import { describe, expect, it } from 'vitest';
import { engineTeam, findTeam, findVenue, teams, venues } from '../src';
import { validateAllTeams, validateAllVenues } from '../src/schema';

describe('content data', () => {
  it('ships valid venues and teams', () => {
    expect(validateAllVenues(venues)).toEqual([]);
    expect(validateAllTeams(teams)).toEqual([]);
    expect(venues.length).toBeGreaterThanOrEqual(8);
    expect(teams.length).toBeGreaterThanOrEqual(4);
  });

  it('converts a team into a playable engine team', () => {
    const team = engineTeam('eng-legends');
    expect(team.battingOrder).toHaveLength(11);
    expect(team.bowlingAttack.length).toBeGreaterThanOrEqual(4);
    expect(team.battingOrder[0]?.battingPositionRole).toBe('opener');
    expect(team.bowlingAttack.every((player) => player.ratings.bowlingSkill > 0)).toBe(true);
    expect(team.bowlingAttack[0]?.bowlingRole).toBe('new-ball');
  });

  it('throws on unknown ids', () => {
    expect(() => findTeam('does-not-exist')).toThrow();
    expect(() => findVenue('does-not-exist')).toThrow();
  });
});
