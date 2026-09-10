export interface Fixture {
  round: number;
  homeId: string;
  awayId: string;
}

const BYE = '__BYE__';

/** Round-robin schedule using the circle method. Odd team counts get a bye each round. */
export function roundRobin(teamIds: readonly string[], doubleRound = false): Fixture[] {
  const teams = [...teamIds];
  if (teams.length < 2) return [];
  if (teams.length % 2 === 1) teams.push(BYE);
  const n = teams.length;
  const half = n / 2;
  const rotation = [...teams];
  const first: Fixture[] = [];

  for (let round = 0; round < n - 1; round += 1) {
    for (let i = 0; i < half; i += 1) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a === undefined || b === undefined || a === BYE || b === BYE) continue;
      const homeFirst = (round + i) % 2 === 0;
      first.push({ round: round + 1, homeId: homeFirst ? a : b, awayId: homeFirst ? b : a });
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    const last = rest.pop();
    if (fixed !== undefined && last !== undefined) {
      rest.unshift(last);
      rotation.length = 0;
      rotation.push(fixed, ...rest);
    }
  }

  if (!doubleRound) return first;
  const second = first.map((fixture) => ({
    round: fixture.round + (n - 1),
    homeId: fixture.awayId,
    awayId: fixture.homeId,
  }));
  return [...first, ...second];
}

export function fixturesForTeam(fixtures: readonly Fixture[], teamId: string): Fixture[] {
  return fixtures.filter((fixture) => fixture.homeId === teamId || fixture.awayId === teamId);
}
