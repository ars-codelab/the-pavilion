import { engineTeam, findVenue } from '@pavilion/data';
import { FORMATS, Random, simulateMatch } from '@pavilion/engine';
import type { FormatId, Player, Team } from '@pavilion/engine';

const formatArg = (process.argv[2] ?? 'test') as FormatId;
const spec = FORMATS[formatArg];
if (spec === undefined) {
  console.error(`Unknown format "${formatArg}". Use test, odi or t20.`);
  process.exit(1);
}

const home = engineTeam(process.argv[3] ?? 'eng-legends');
const away = engineTeam(process.argv[4] ?? 'ind-legends');
const venueId = process.argv[5] ?? 'lords';
const seed = process.argv[6] ?? '1';

let venue;
try {
  venue = findVenue(venueId);
} catch {
  console.error(`Unknown venue "${venueId}".`);
  process.exit(1);
}

const result = simulateMatch(new Random(seed), {
  spec,
  home,
  away,
  conditions: { venue },
});

const players = new Map<string, Player>();
for (const team of [home, away]) {
  for (const player of [...team.battingOrder, ...team.bowlingAttack])
    players.set(player.id, player);
}

function nameOf(id: string): string {
  return players.get(id)?.surname ?? id;
}

function overs(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function ordinal(value: number): string {
  if (value === 1) return 'st';
  if (value === 2) return 'nd';
  if (value === 3) return 'rd';
  return 'th';
}

function teamOf(id: string): Team {
  return id === home.id ? home : away;
}

console.log('');
console.log('==================================================');
console.log('  The Pavilion');
console.log(`  ${home.name} v ${away.name}`);
console.log(`  ${spec.name} at ${venue.name}, ${venue.city}`);
console.log('==================================================');
const tossWinner = teamOf(result.toss.winnerTeamId);
console.log(`Toss: ${tossWinner.name} won and chose to ${result.toss.decision}.`);
console.log('');

result.innings.forEach((innings, index) => {
  const batting = teamOf(innings.battingTeamId);
  const runRate =
    innings.state.legalBalls > 0
      ? (innings.state.runs / (innings.state.legalBalls / spec.ballsPerOver)).toFixed(2)
      : '0.00';
  const declared = innings.declared ? ' dec' : '';
  const label = `${index + 1}${ordinal(index + 1)}`;
  console.log(
    `${batting.name} ${label} innings${declared}: ${innings.state.runs}/${innings.state.wickets} ` +
      `(${overs(innings.state.legalBalls)} ov, RR ${runRate})`,
  );
  const bowlers = [...innings.bowlers]
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)
    .slice(0, 4)
    .map(
      (bowler) =>
        `${nameOf(bowler.playerId)} ${overs(bowler.legalBalls)}-${bowler.maidens}-${bowler.runs}-${bowler.wickets}`,
    );
  if (bowlers.length > 0) console.log(`  Bowling: ${bowlers.join('; ')}`);
  if (innings.target !== null) console.log(`  Target: ${innings.target}`);
  console.log('');
});

console.log(`Result: ${result.resultText}`);
console.log('');
