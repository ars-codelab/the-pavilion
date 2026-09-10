export interface CricsheetInnings {
  team: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  deliveries: number;
  dotBalls: number;
  fours: number;
  sixes: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
}

export interface CricsheetMatch {
  matchType: string;
  gender: string;
  date: string | null;
  month: number | null;
  venue: string | null;
  city: string | null;
  teams: [string, string];
  innings: CricsheetInnings[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function numberField(record: Record<string, unknown> | null, key: string): number {
  return record === null ? 0 : asNumber(record[key]);
}

function parseInnings(value: unknown, inningsNumber: number): CricsheetInnings {
  const record = asRecord(value);
  if (record === null) throw new Error('cricsheet: innings must be an object');

  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;
  let deliveries = 0;
  let dotBalls = 0;
  let fours = 0;
  let sixes = 0;
  let wides = 0;
  let noBalls = 0;
  let byes = 0;
  let legByes = 0;

  for (const overValue of asArray(record.overs)) {
    const over = asRecord(overValue);
    if (over === null) continue;
    for (const deliveryValue of asArray(over.deliveries)) {
      const delivery = asRecord(deliveryValue);
      if (delivery === null) continue;
      const runRecord = asRecord(delivery.runs);
      const batterRuns = numberField(runRecord, 'batter');
      const totalRuns = numberField(runRecord, 'total');
      runs += totalRuns;
      deliveries += 1;
      if (batterRuns === 4) fours += 1;
      if (batterRuns === 6) sixes += 1;

      const extraRecord = asRecord(delivery.extras);
      const w = numberField(extraRecord, 'wides');
      const nb = numberField(extraRecord, 'noballs');
      wides += w;
      noBalls += nb;
      byes += numberField(extraRecord, 'byes');
      legByes += numberField(extraRecord, 'legbyes');
      if (w === 0 && nb === 0) {
        legalBalls += 1;
        if (totalRuns === 0) dotBalls += 1;
      }

      wickets += asArray(delivery.wickets).length;
    }
  }

  return {
    team: asString(record.team) ?? 'Unknown',
    inningsNumber,
    runs,
    wickets,
    legalBalls,
    deliveries,
    dotBalls,
    fours,
    sixes,
    wides,
    noBalls,
    byes,
    legByes,
  };
}

export function parseCricsheetMatch(input: unknown): CricsheetMatch {
  const root = asRecord(input);
  if (root === null) throw new Error('cricsheet: root must be an object');
  const info = asRecord(root.info);
  if (info === null) throw new Error('cricsheet: missing info');

  const teams = asArray(info.teams).map(asString);
  const firstTeam = teams[0];
  const secondTeam = teams[1];
  if (
    firstTeam === null ||
    firstTeam === undefined ||
    secondTeam === null ||
    secondTeam === undefined
  ) {
    throw new Error('cricsheet: info.teams must contain at least two names');
  }

  const dates = asArray(info.dates).map(asString);
  const firstDate = dates[0] ?? null;
  const month = firstDate === null ? null : Number.parseInt(firstDate.slice(5, 7), 10);

  return {
    matchType: asString(info.match_type) ?? 'Unknown',
    gender: asString(info.gender) ?? 'unknown',
    date: firstDate,
    month: Number.isFinite(month) ? month : null,
    venue: asString(info.venue),
    city: asString(info.city),
    teams: [firstTeam, secondTeam],
    innings: asArray(root.innings).map((innings, index) => parseInnings(innings, index + 1)),
  };
}
