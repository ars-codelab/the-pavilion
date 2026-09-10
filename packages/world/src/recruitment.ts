import type { Random } from '@pavilion/engine';

export type AuctionRole = 'batter' | 'bowler' | 'all-rounder' | 'keeper';

export interface AuctionPlayer {
  id: string;
  role: AuctionRole;
  overseas: boolean;
  capped: boolean;
  /** Opening bid in the smallest currency unit (e.g. lakhs or thousands). */
  basePrice: number;
  rating: number;
}

export interface SquadMember {
  playerId: string;
  price: number;
}

export interface Franchise {
  id: string;
  name: string;
  purse: number;
  squad: SquadMember[];
}

export interface AuctionRules {
  maxSquad: number;
  minSquad: number;
  maxOverseas: number;
  /** Kept back per remaining minimum-squad slot so a side can always fill its squad. */
  reservePerSlot: number;
}

export interface Assignment {
  playerId: string;
  franchiseId: string;
  price: number;
}

export interface AuctionResult {
  assignments: Assignment[];
  unsold: string[];
  franchises: Franchise[];
}

function spent(franchise: Franchise): number {
  return franchise.squad.reduce((sum, member) => sum + member.price, 0);
}

export function overseasCount(franchise: Franchise, players: Map<string, AuctionPlayer>): number {
  return franchise.squad.filter((member) => players.get(member.playerId)?.overseas === true).length;
}

function canBid(
  franchise: Franchise,
  player: AuctionPlayer,
  players: Map<string, AuctionPlayer>,
  price: number,
  rules: AuctionRules,
): boolean {
  if (franchise.squad.length >= rules.maxSquad) return false;
  if (player.overseas && overseasCount(franchise, players) >= rules.maxOverseas) return false;
  const slotsAfter = Math.max(0, rules.minSquad - franchise.squad.length - 1);
  const reserve = slotsAfter * rules.reservePerSlot;
  return spent(franchise) + price + reserve <= franchise.purse;
}

function bidStep(price: number): number {
  if (price < 100) return 5;
  if (price < 300) return 10;
  if (price < 600) return 20;
  if (price < 1000) return 25;
  return 50;
}

/**
 * Run a sealed incremental auction. Players are offered best-first; eligible franchises
 * raise each other by a step until only one remains, then the leader pays the final price.
 */
export function runAuction(
  random: Random,
  players: AuctionPlayer[],
  franchises: Franchise[],
  rules: AuctionRules,
): AuctionResult {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const working = franchises.map((franchise) => ({
    ...franchise,
    squad: franchise.squad.map((member) => ({ ...member })),
  }));
  const assignments: Assignment[] = [];
  const unsold: string[] = [];

  const order = [...players].sort(
    (a, b) => b.rating + b.basePrice / 100 - (a.rating + a.basePrice / 100),
  );

  for (const player of order) {
    let contenders = working.filter((franchise) =>
      canBid(franchise, player, playerMap, player.basePrice, rules),
    );
    if (contenders.length === 0) {
      unsold.push(player.id);
      continue;
    }

    let price = player.basePrice;
    let leader = random.pick(contenders);
    let guard = 0;
    while (contenders.length > 1 && guard < 100) {
      guard += 1;
      const challengers = contenders.filter((franchise) => franchise.id !== leader.id);
      const challenger = random.pick(challengers);
      const nextPrice = price + bidStep(price);
      if (!canBid(challenger, player, playerMap, nextPrice, rules)) {
        contenders = contenders.filter((franchise) => franchise.id !== challenger.id);
        continue;
      }
      price = nextPrice;
      leader = challenger;
      contenders = contenders.filter(
        (franchise) =>
          franchise.id === leader.id ||
          canBid(franchise, player, playerMap, price + bidStep(price), rules),
      );
    }

    leader.squad.push({ playerId: player.id, price });
    assignments.push({ playerId: player.id, franchiseId: leader.id, price });
  }

  return { assignments, unsold, franchises: working };
}

/** Direct signing (BBL-style): validate cap, squad size and overseas limits. */
export function signDirect(
  franchise: Franchise,
  player: AuctionPlayer,
  players: Map<string, AuctionPlayer>,
  price: number,
  rules: AuctionRules,
): Franchise {
  if (franchise.squad.length >= rules.maxSquad) {
    throw new Error(`${franchise.name} squad is full`);
  }
  if (player.overseas && overseasCount(franchise, players) >= rules.maxOverseas) {
    throw new Error(`${franchise.name} has reached its overseas limit`);
  }
  if (spent(franchise) + price > franchise.purse) {
    throw new Error(`${franchise.name} cannot afford ${player.id}`);
  }
  return {
    ...franchise,
    squad: [...franchise.squad.map((member) => ({ ...member })), { playerId: player.id, price }],
  };
}
