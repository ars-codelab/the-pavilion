import { describe, expect, it } from 'vitest';
import { Random } from '@pavilion/engine';
import { overseasCount, runAuction, signDirect } from '../src/recruitment';
import type { AuctionPlayer, AuctionRules, Franchise } from '../src/recruitment';

const RULES: AuctionRules = {
  maxSquad: 6,
  minSquad: 5,
  maxOverseas: 2,
  reservePerSlot: 20,
};

function makePlayers(count: number): AuctionPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    role: 'batter',
    overseas: index % 4 === 0,
    capped: index % 3 !== 0,
    basePrice: 20 + (index % 5) * 10,
    rating: 40 + (index % 10) * 5,
  }));
}

function makeFranchises(count: number): Franchise[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `f${index + 1}`,
    name: `Franchise ${index + 1}`,
    purse: 500,
    squad: [],
  }));
}

describe('recruitment', () => {
  it('runs an auction respecting purse, squad and overseas limits', () => {
    const players = makePlayers(40);
    const playerMap = new Map(players.map((player) => [player.id, player]));
    const result = runAuction(new Random(1), players, makeFranchises(6), RULES);

    const assigned = new Set(result.assignments.map((assignment) => assignment.playerId));
    expect(assigned.size).toBe(result.assignments.length);
    expect(result.assignments.length + result.unsold.length).toBeGreaterThan(0);

    for (const franchise of result.franchises) {
      const spend = franchise.squad.reduce((sum, member) => sum + member.price, 0);
      expect(franchise.squad.length).toBeLessThanOrEqual(RULES.maxSquad);
      expect(spend).toBeLessThanOrEqual(franchise.purse);
      expect(overseasCount(franchise, playerMap)).toBeLessThanOrEqual(RULES.maxOverseas);
    }
  });

  it('is deterministic for a seed', () => {
    const a = runAuction(new Random('auction'), makePlayers(30), makeFranchises(5), RULES);
    const b = runAuction(new Random('auction'), makePlayers(30), makeFranchises(5), RULES);
    expect(a.assignments).toEqual(b.assignments);
  });

  it('enforces direct-signing constraints', () => {
    const player: AuctionPlayer = {
      id: 'star',
      role: 'batter',
      overseas: true,
      capped: true,
      basePrice: 100,
      rating: 80,
    };
    const playerMap = new Map([[player.id, player]]);

    const rich: Franchise = { id: 'rich', name: 'Rich', purse: 1000, squad: [] };
    const signed = signDirect(rich, player, playerMap, 200, RULES);
    expect(signed.squad).toHaveLength(1);

    const poor: Franchise = { id: 'poor', name: 'Poor', purse: 100, squad: [] };
    expect(() => signDirect(poor, player, playerMap, 200, RULES)).toThrow();

    const full: Franchise = {
      id: 'full',
      name: 'Full',
      purse: 1000,
      squad: Array.from({ length: RULES.maxSquad }, (_, index) => ({
        playerId: `x${index}`,
        price: 10,
      })),
    };
    expect(() => signDirect(full, player, playerMap, 10, RULES)).toThrow();
  });
});
