import { describe, expect, it } from 'vitest';
import {
  derivePortrait,
  engineTeam,
  findMarquee,
  findTeam,
  findVenue,
  marquee,
  teams,
  venues,
} from '../src';
import { validateAllMarquee, validateAllTeams, validateAllVenues } from '../src/schema';

describe('content data', () => {
  it('ships valid venues and teams', () => {
    expect(validateAllVenues(venues)).toEqual([]);
    expect(validateAllTeams(teams)).toEqual([]);
    expect(venues.length).toBeGreaterThanOrEqual(8);
    expect(teams.length).toBeGreaterThanOrEqual(4);
  });

  it('ships a valid marquee list with derived portrait specs', () => {
    expect(validateAllMarquee(marquee)).toEqual([]);
    expect(marquee.length).toBeGreaterThanOrEqual(90);
    const portrait = derivePortrait(findMarquee('tendulkar'));
    expect(portrait.skinTone).toBeGreaterThanOrEqual(1);
    expect(portrait.skinTone).toBeLessThanOrEqual(5);
    expect(['none', 'cap', 'helmet']).toContain(portrait.headgear);
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
    expect(() => findMarquee('does-not-exist')).toThrow();
  });
});
