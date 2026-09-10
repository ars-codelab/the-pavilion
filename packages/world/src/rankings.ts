export interface RatingSnapshot {
  id: string;
  rating: number;
  matches: number;
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function kFactor(matches: number, base = 32): number {
  if (matches < 10) return base * 1.5;
  if (matches < 30) return base;
  return base * 0.7;
}

export interface RatingPair {
  winner: RatingSnapshot;
  loser: RatingSnapshot;
}

/** Update a pair of ratings after a result. A draw is a 0.5 score for both sides. */
export function updatePair(
  winner: RatingSnapshot,
  loser: RatingSnapshot,
  drawn = false,
): RatingPair {
  const expectedWinner = expectedScore(winner.rating, loser.rating);
  const winnerScore = drawn ? 0.5 : 1;
  const loserScore = 1 - winnerScore;

  return {
    winner: {
      ...winner,
      rating: winner.rating + kFactor(winner.matches) * (winnerScore - expectedWinner),
      matches: winner.matches + 1,
    },
    loser: {
      ...loser,
      rating: loser.rating + kFactor(loser.matches) * (loserScore - (1 - expectedWinner)),
      matches: loser.matches + 1,
    },
  };
}

export function rankTeams(ratings: readonly RatingSnapshot[]): RatingSnapshot[] {
  return [...ratings].sort((a, b) => b.rating - a.rating);
}
