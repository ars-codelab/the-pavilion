import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FORMATS,
  Random,
  parseCricsheetMatch,
  simulateInnings,
  summariseInnings,
  summariseMatches,
} from '@pavilion/engine';
import type {
  CalibrationSummary,
  CricsheetInnings,
  CricsheetMatch,
  FormatId,
  Player,
} from '@pavilion/engine';

const DEFAULT_ROOT = '.cricsheet';
const SIM_INNINGS = 1200;
const SEGMENTS = process.argv.includes('--segments');

const BATTING = [45, 42, 40, 38, 36, 34, 30, 26, 18, 12, 8];
const BOWLING = [46, 43, 40, 37, 30];

const FULL_MEMBERS = new Set([
  'Australia',
  'England',
  'India',
  'Pakistan',
  'South Africa',
  'New Zealand',
  'Sri Lanka',
  'West Indies',
  'Bangladesh',
  'Zimbabwe',
  'Afghanistan',
  'Ireland',
]);

const TIER_1 = new Set(['Australia', 'England', 'India', 'South Africa', 'New Zealand']);
const TIER_2 = new Set(['Pakistan', 'Sri Lanka', 'West Indies']);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function tierOf(team: string): string {
  if (TIER_1.has(team)) return 'T1';
  if (TIER_2.has(team)) return 'T2';
  return 'T3';
}

function loadMatches(directory: string, sinceYear: number, gender: string): CricsheetMatch[] {
  if (!existsSync(directory)) return [];
  const matches: CricsheetMatch[] = [];
  for (const name of readdirSync(directory)) {
    if (!name.endsWith('.json')) continue;
    const raw = readFileSync(join(directory, name), 'utf8');
    const match = parseCricsheetMatch(JSON.parse(raw));
    if (gender !== 'all' && match.gender !== gender) continue;
    if (!match.teams.every((team) => FULL_MEMBERS.has(team))) continue;
    if (match.date !== null) {
      const year = Number.parseInt(match.date.slice(0, 4), 10);
      if (Number.isFinite(year) && year < sinceYear) continue;
    }
    matches.push(match);
  }
  return matches;
}

function makePlayer(id: string, batting: number, bowling: number): Player {
  return {
    id,
    surname: id,
    initials: 'X',
    nationality: 'TST',
    battingPositionRole: 'specialist',
    battingStyle: 'strokeplayer',
    bowlingType: bowling > 0 ? 'fast' : 'none',
    bowlingRole: bowling > 0 ? 'main' : 'never',
    fieldingType: 'normal',
    isWicketKeeper: false,
    ratings: {
      battingSkill: batting,
      bowlingSkill: bowling,
      fieldingSkill: 15,
      battingAggression: 50,
      bowlingAggression: 50,
    },
  };
}

function simulatedMatches(format: FormatId, innings: number, seed: number): CricsheetMatch[] {
  const random = new Random(seed);
  const order = BATTING.map((skill, index) => makePlayer(`A${index + 1}`, skill, 0));
  const attack = BOWLING.map((skill, index) => makePlayer(`B${index + 1}`, 15, skill));
  const matches: CricsheetMatch[] = [];

  for (let i = 0; i < innings; i++) {
    const { state, metrics } = simulateInnings(random, {
      spec: FORMATS[format],
      battingTeamId: 'A',
      bowlingTeamId: 'B',
      battingOrder: order,
      bowlingAttack: attack,
    });
    matches.push({
      matchType: FORMATS[format].name,
      gender: 'male',
      date: null,
      month: null,
      venue: null,
      city: null,
      teams: ['A', 'B'],
      innings: [
        {
          team: 'A',
          inningsNumber: 1,
          runs: state.runs,
          wickets: state.wickets,
          legalBalls: state.legalBalls,
          deliveries: metrics.deliveries,
          dotBalls: metrics.dotBalls,
          fours: metrics.fours,
          sixes: metrics.sixes,
          wides: metrics.wides,
          noBalls: metrics.noBalls,
          byes: 0,
          legByes: 0,
        },
      ],
    });
  }
  return matches;
}

function row(label: string, summary: CalibrationSummary) {
  return {
    source: label,
    innings: summary.innings,
    runsPerInnings: summary.runsPerInnings.toFixed(1),
    wicketsPerInnings: summary.wicketsPerInnings.toFixed(2),
    runsPerOver: summary.runsPerOver.toFixed(2),
    ballsPerWicket: summary.ballsPerWicket.toFixed(1),
    dotRate: summary.dotRate.toFixed(3),
    boundaryRate: summary.boundaryRate.toFixed(3),
    fourRate: (summary.fours / Math.max(1, summary.legalBalls)).toFixed(3),
    sixRate: (summary.sixes / Math.max(1, summary.legalBalls)).toFixed(3),
  };
}

interface InningsRef {
  innings: CricsheetInnings;
  match: CricsheetMatch;
}

function groupReport(label: string, refs: InningsRef[], keyFn: (ref: InningsRef) => string | null) {
  const groups = new Map<string, CricsheetInnings[]>();
  for (const ref of refs) {
    const key = keyFn(ref);
    if (key === null) continue;
    const list = groups.get(key) ?? [];
    list.push(ref.innings);
    groups.set(key, list);
  }
  const rows = [...groups.entries()]
    .filter(([, list]) => list.length >= 30)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([key, list]) => row(key, summariseInnings(list)));
  if (rows.length === 0) return;
  console.log(`\n  -- ${label} --`);
  console.table(rows);
}

const root = process.argv[2] ?? DEFAULT_ROOT;
const sinceYear = Number.parseInt(process.argv[3] ?? '2018', 10);
const gender = process.argv[4] ?? 'male';
console.log(`Calibration root: ${root} (gender ${gender}, since ${sinceYear})`);

const datasets: { format: FormatId; directory: string; seed: number }[] = [
  { format: 'test', directory: join(root, 'tests'), seed: 2001 },
  { format: 'odi', directory: join(root, 'odis'), seed: 2002 },
  { format: 't20', directory: join(root, 't20s'), seed: 2003 },
];

for (const dataset of datasets) {
  const real = loadMatches(dataset.directory, sinceYear, gender);
  if (real.length === 0) {
    console.log(`\n[${dataset.format}] no real data at ${dataset.directory} - skipping`);
    continue;
  }
  const realSummary = summariseMatches(real);
  const simSummary = summariseMatches(simulatedMatches(dataset.format, SIM_INNINGS, dataset.seed));
  console.log(`\n[${dataset.format}] real matches: ${real.length}`);
  console.table([
    row(`real ${dataset.format}`, realSummary),
    row(`sim  ${dataset.format}`, simSummary),
  ]);

  if (SEGMENTS) {
    const refs: InningsRef[] = real.flatMap((match) =>
      match.innings.map((entry) => ({ innings: entry, match })),
    );
    groupReport('by innings number', refs, (ref) => `inn ${ref.innings.inningsNumber}`);
    groupReport('by month', refs, (ref) =>
      ref.match.month === null ? null : (MONTHS[ref.match.month - 1] ?? null),
    );
    groupReport('by team tier', refs, (ref) => `${tierOf(ref.innings.team)} ${ref.innings.team}`);
    groupReport('by venue (top)', refs, (ref) => ref.match.venue ?? ref.match.city);
  }
}
