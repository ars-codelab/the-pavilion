import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { engineTeam, teams, venues } from '@pavilion/data';
import {
  FORMATS,
  Random,
  seriesPlayerStats,
  simulateMatch,
  simulateSeries,
} from '@pavilion/engine';
import type { FormatId, MatchResult, Player, SeriesResult, Team } from '@pavilion/engine';
import { generatePressConference } from '@pavilion/narrative';
import {
  interviewScene,
  postMatchScene,
  preMatchScene,
  startScene,
  tick,
} from '@pavilion/presentation';
import type { Scene } from '@pavilion/presentation';
import { deleteSave, listSaves, putSave } from './storage';
import type { SaveRecord } from './storage';

const FORMAT_IDS: FormatId[] = ['test', 'odi', 't20'];

type Mode = 'match' | 'series';

interface MatchState {
  result: MatchResult;
  home: Team;
  away: Team;
}

interface SavePayload {
  kind: Mode;
  seed: string;
  format: FormatId;
  homeId: string;
  awayId: string;
  venueId: string;
  seriesLength: number;
  match: MatchState | null;
  series: SeriesResult | null;
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

function topScorerName(match: MatchResult, players: Map<string, Player>): string {
  let best = '';
  let runs = -1;
  for (const innings of match.innings) {
    for (const entry of innings.state.battingCard) {
      if (entry.runs > runs) {
        runs = entry.runs;
        best = entry.playerId;
      }
    }
  }
  return players.get(best)?.surname ?? 'the captain';
}

function buildScenes(
  random: Random,
  result: MatchResult,
  home: Team,
  away: Team,
  venueName: string,
): Scene[] {
  const players = new Map<string, Player>();
  for (const team of [home, away]) {
    for (const entry of [...team.battingOrder, ...team.bowlingAttack]) players.set(entry.id, entry);
  }
  const letter: 'W' | 'L' | 'D' | 'T' = result.drawn
    ? 'D'
    : result.tied
      ? 'T'
      : result.winnerTeamId === home.id
        ? 'W'
        : 'L';
  const question = generatePressConference(
    random,
    {
      teamName: home.name,
      matchesPlayed: 1,
      recentResults: [letter],
      form: 50,
      morale: 60,
      boardConfidence: 60,
      reputation: 50,
      starPlayerName: topScorerName(result, players),
      starPlayerForm: 50,
    },
    1,
  )[0];
  const scenes: Scene[] = [
    preMatchScene(result, venueName, result.format.toUpperCase()),
    postMatchScene(result),
  ];
  if (question !== undefined) scenes.push(interviewScene(question));
  return scenes;
}

export function App() {
  const [mode, setMode] = useState<Mode>('match');
  const [format, setFormat] = useState<FormatId>('t20');
  const [homeId, setHomeId] = useState(teams[0]?.id ?? 'eng-legends');
  const [awayId, setAwayId] = useState(teams[1]?.id ?? 'ind-legends');
  const [venueId, setVenueId] = useState(venues[0]?.id ?? 'lords');
  const [seed, setSeed] = useState('1');
  const [seriesLength, setSeriesLength] = useState(3);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [series, setSeries] = useState<SeriesResult | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [saves, setSaves] = useState<SaveRecord[]>([]);

  useEffect(() => {
    void refreshSaves();
  }, []);

  async function refreshSaves() {
    setSaves(await listSaves());
  }

  const venue = venues.find((entry) => entry.id === venueId) ?? venues[0];

  function play() {
    if (homeId === awayId) return;
    const home = engineTeam(homeId);
    const away = engineTeam(awayId);
    const random = new Random(seed);
    if (mode === 'match') {
      const result = simulateMatch(random, {
        spec: FORMATS[format],
        home,
        away,
        conditions: { venue },
      });
      setMatch({ result, home, away });
      setSeries(null);
      setScenes(buildScenes(random, result, home, away, venue?.name ?? 'the ground'));
    } else {
      const result = simulateSeries(random, {
        spec: FORMATS[format],
        home,
        away,
        matches: seriesLength,
        conditionsForMatch: () => ({ venue }),
      });
      setSeries(result);
      setMatch(null);
      setScenes([]);
    }
  }

  function playersFor(home: Team, away: Team): Map<string, Player> {
    const map = new Map<string, Player>();
    for (const team of [home, away]) {
      for (const player of [...team.battingOrder, ...team.bowlingAttack])
        map.set(player.id, player);
    }
    return map;
  }

  async function save() {
    const key =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const payload: SavePayload = {
      kind: mode,
      seed,
      format,
      homeId,
      awayId,
      venueId,
      seriesLength,
      match,
      series,
    };
    const label =
      match !== null
        ? `${match.home.name} v ${match.away.name}`
        : series !== null
          ? `${series.home.name} v ${series.away.name} series`
          : 'Pavilion game';
    await putSave({ key, label, savedAt: Date.now(), payload });
    await refreshSaves();
  }

  function loadRecord(record: SaveRecord) {
    const payload = record.payload as SavePayload;
    setMode(payload.kind);
    setSeed(payload.seed);
    setFormat(payload.format);
    setHomeId(payload.homeId);
    setAwayId(payload.awayId);
    setVenueId(payload.venueId);
    setSeriesLength(payload.seriesLength);
    setMatch(payload.match);
    setSeries(payload.series);
  }

  async function remove(key: string) {
    await deleteSave(key);
    await refreshSaves();
  }

  const hasResult = match !== null || series !== null;
  const currentPlayers = useMemo(() => {
    if (match !== null) return playersFor(match.home, match.away);
    if (series !== null) return playersFor(series.home, series.away);
    return new Map<string, Player>();
  }, [match, series]);
  const nameOf = (id: string): string => currentPlayers.get(id)?.surname ?? id;

  return (
    <div className="min-h-screen bg-pavilion-bg px-3 py-5 font-mono text-pavilion-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="border-2 border-pavilion-line bg-pavilion-panel px-4 py-3">
          <h1 className="text-xl font-bold tracking-[0.3em] text-pavilion-accent">THE PAVILION</h1>
          <p className="mt-1 text-xs text-pavilion-dim">
            Cricket, simulated ball by ball. Deterministic, offline, all three formats.
          </p>
        </header>

        <section className="border-2 border-pavilion-line bg-pavilion-panel p-4">
          <div className="mb-3 flex gap-2">
            {(['match', 'series'] as Mode[]).map((value) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`border px-3 py-1 text-xs uppercase tracking-widest ${
                  mode === value
                    ? 'border-pavilion-accent bg-pavilion-accent text-pavilion-bg'
                    : 'border-pavilion-line text-pavilion-dim'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="mb-3 flex gap-2">
            {FORMAT_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setFormat(id)}
                className={`border px-3 py-1 text-xs uppercase tracking-widest ${
                  format === id
                    ? 'border-pavilion-accent bg-pavilion-accent text-pavilion-bg'
                    : 'border-pavilion-line text-pavilion-dim'
                }`}
              >
                {FORMATS[id].name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Home">
              <select
                value={homeId}
                onChange={(e) => setHomeId(e.target.value)}
                className={selectClass}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Away">
              <select
                value={awayId}
                onChange={(e) => setAwayId(e.target.value)}
                className={selectClass}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Venue">
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className={selectClass}
              >
                {venues.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}, {entry.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Seed">
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className={selectClass}
              />
            </Field>
            {mode === 'series' && (
              <Field label="Matches">
                <select
                  value={seriesLength}
                  onChange={(e) => setSeriesLength(Number(e.target.value))}
                  className={selectClass}
                >
                  {[1, 3, 5, 7].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={play}
              disabled={homeId === awayId}
              className="flex-1 border-2 border-pavilion-accent bg-pavilion-accent px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-pavilion-bg disabled:opacity-40"
            >
              {homeId === awayId
                ? 'Choose two different sides'
                : mode === 'match'
                  ? 'Play match'
                  : 'Play series'}
            </button>
            <button
              onClick={() => void save()}
              disabled={!hasResult}
              className="border-2 border-pavilion-line px-4 py-3 text-xs uppercase tracking-widest text-pavilion-dim disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </section>

        {match !== null && scenes[0] !== undefined && (
          <ScenePlayer scene={scenes[0]} title="Pre-match" />
        )}
        {match !== null && <MatchView match={match} nameOf={nameOf} />}
        {match !== null &&
          scenes
            .slice(1)
            .map((scene) => (
              <ScenePlayer
                key={scene.id}
                scene={scene}
                title={scene.id.startsWith('interview') ? 'Press conference' : 'Post-match'}
              />
            ))}
        {series !== null && <SeriesView series={series} nameOf={nameOf} />}

        <SavesPanel saves={saves} onLoad={loadRecord} onDelete={(key) => void remove(key)} />

        <footer className="pb-6 text-center text-[10px] text-pavilion-dim">
          Deterministic engine · offline · save to your device
        </footer>
      </div>
    </div>
  );
}

const selectClass = 'w-full border border-pavilion-line bg-pavilion-bg px-2 py-2 text-sm';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-pavilion-dim">
      {label}
      {children}
    </label>
  );
}

function MatchView({ match, nameOf }: { match: MatchState; nameOf: (id: string) => string }) {
  const teamName = (id: string): string =>
    match.home.id === id ? match.home.name : match.away.name;
  return (
    <section className="flex flex-col gap-4">
      <div className="border-2 border-pavilion-line bg-pavilion-panel px-4 py-3">
        <div className="text-xs text-pavilion-dim">
          {teamName(match.result.toss.winnerTeamId)} won the toss and chose to{' '}
          {match.result.toss.decision}.
        </div>
        <div className="mt-2 border border-pavilion-accent px-3 py-2 text-sm font-bold text-pavilion-accent">
          {match.result.resultText}
        </div>
      </div>
      {match.result.innings.map((innings, index) => (
        <InningsPanel
          key={index}
          title={`${teamName(innings.battingTeamId)} ${index + 1}${ordinal(index + 1)} innings${
            innings.declared ? ' (dec)' : ''
          }`}
          runs={innings.state.runs}
          wickets={innings.state.wickets}
          legalBalls={innings.state.legalBalls}
          target={innings.target}
          battingCard={innings.state.battingCard}
          bowlers={innings.bowlers}
          nameOf={nameOf}
        />
      ))}
    </section>
  );
}

function SeriesView({ series, nameOf }: { series: SeriesResult; nameOf: (id: string) => string }) {
  const stats = useMemo(() => seriesPlayerStats(series), [series]);
  const topBatting = [...stats].sort((a, b) => b.runs - a.runs).slice(0, 5);
  const topBowling = [...stats].sort((a, b) => b.wickets - a.wickets).slice(0, 5);
  return (
    <section className="flex flex-col gap-4">
      <div className="border-2 border-pavilion-line bg-pavilion-panel px-4 py-3">
        <div className="text-sm font-bold text-pavilion-accent">{series.summary}</div>
        <div className="mt-1 text-xs text-pavilion-dim">
          {series.home.name} {series.homeWins} · {series.awayWins} {series.away.name}
          {series.draws > 0 ? ` · ${series.draws} drawn` : ''}
          {series.ties > 0 ? ` · ${series.ties} tied` : ''}
        </div>
      </div>

      <div className="border-2 border-pavilion-line bg-pavilion-panel p-4 text-xs">
        <div className="mb-2 text-pavilion-dim">Results</div>
        {series.matches.map((matchResult, index) => (
          <div key={index} className="flex justify-between border-t border-pavilion-line/50 py-1">
            <span>Match {index + 1}</span>
            <span className="text-pavilion-accent">{matchResult.resultText}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Leaderboard
          title="Most runs"
          rows={topBatting.map((entry) => `${nameOf(entry.playerId)} — ${entry.runs}`)}
        />
        <Leaderboard
          title="Most wickets"
          rows={topBowling.map((entry) => `${nameOf(entry.playerId)} — ${entry.wickets}`)}
        />
      </div>
    </section>
  );
}

function Leaderboard({ title, rows }: { title: string; rows: string[] }) {
  return (
    <div className="border-2 border-pavilion-line bg-pavilion-panel p-4 text-xs">
      <div className="mb-2 text-pavilion-dim">{title}</div>
      {rows.map((row, index) => (
        <div key={index} className="border-t border-pavilion-line/50 py-1">
          {row}
        </div>
      ))}
    </div>
  );
}

function InningsPanel(props: {
  title: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  target: number | null;
  battingCard: {
    playerId: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    out: boolean;
  }[];
  bowlers: {
    playerId: string;
    legalBalls: number;
    maidens: number;
    runs: number;
    wickets: number;
  }[];
  nameOf: (id: string) => string;
}) {
  return (
    <div className="border-2 border-pavilion-line bg-pavilion-panel p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-bold">{props.title}</div>
        <div className="text-sm text-pavilion-accent">
          {props.runs}/{props.wickets}{' '}
          <span className="text-pavilion-dim">({overs(props.legalBalls)} ov)</span>
        </div>
      </div>
      {props.target !== null && (
        <div className="mt-1 text-xs text-pavilion-dim">Target {props.target}</div>
      )}
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="text-pavilion-dim">
            <th className="py-1 text-left font-normal">Batter</th>
            <th className="py-1 text-right font-normal">R</th>
            <th className="py-1 text-right font-normal">B</th>
            <th className="py-1 text-right font-normal">4s</th>
            <th className="py-1 text-right font-normal">6s</th>
          </tr>
        </thead>
        <tbody>
          {props.battingCard.map((batter, index) => (
            <tr key={index} className="border-t border-pavilion-line/50">
              <td className="py-1">
                {props.nameOf(batter.playerId)}
                {batter.out ? '' : ' *'}
              </td>
              <td className="py-1 text-right text-pavilion-accent">{batter.runs}</td>
              <td className="py-1 text-right">{batter.balls}</td>
              <td className="py-1 text-right">{batter.fours}</td>
              <td className="py-1 text-right">{batter.sixes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="mt-3 w-full border-collapse text-xs">
        <thead>
          <tr className="text-pavilion-dim">
            <th className="py-1 text-left font-normal">Bowler</th>
            <th className="py-1 text-right font-normal">O</th>
            <th className="py-1 text-right font-normal">M</th>
            <th className="py-1 text-right font-normal">R</th>
            <th className="py-1 text-right font-normal">W</th>
          </tr>
        </thead>
        <tbody>
          {props.bowlers.map((bowler, index) => (
            <tr key={index} className="border-t border-pavilion-line/50">
              <td className="py-1">{props.nameOf(bowler.playerId)}</td>
              <td className="py-1 text-right">{overs(bowler.legalBalls)}</td>
              <td className="py-1 text-right">{bowler.maidens}</td>
              <td className="py-1 text-right">{bowler.runs}</td>
              <td className="py-1 text-right text-pavilion-accent">{bowler.wickets}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScenePlayer({ scene, title }: { scene: Scene; title: string }) {
  const [state, setState] = useState(() => startScene(scene));

  useEffect(() => {
    setState(startScene(scene));
  }, [scene]);

  const lastLine = state.lines[state.lines.length - 1];

  return (
    <section className="border-2 border-pavilion-line bg-pavilion-panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-pavilion-dim">{title}</div>
        <div className="text-[10px] text-pavilion-dim">{state.background}</div>
      </div>
      <div className="mt-3 min-h-[3rem] text-sm">
        {lastLine !== undefined ? (
          <span>{lastLine.text}</span>
        ) : (
          <span className="text-pavilion-dim">…</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-pavilion-dim">
        {state.actors.map((actor) => (
          <span key={actor.id} className="border border-pavilion-line px-1">
            {actor.name} · {actor.expression}
          </span>
        ))}
      </div>
      <div className="mt-3">
        {state.pendingChoice !== null ? (
          <div className="flex flex-col gap-2">
            {state.pendingChoice.options.map((option) => (
              <button
                key={option.id}
                onClick={() => setState((current) => tick(current, scene, option.id))}
                className="border border-pavilion-line px-3 py-2 text-left text-xs text-pavilion-ink"
              >
                {option.text}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setState((current) => tick(current, scene))}
            disabled={state.done}
            className="border border-pavilion-accent px-3 py-2 text-xs uppercase tracking-widest text-pavilion-accent disabled:opacity-40"
          >
            {state.done ? 'Scene complete' : 'Continue'}
          </button>
        )}
      </div>
    </section>
  );
}

function SavesPanel({
  saves,
  onLoad,
  onDelete,
}: {
  saves: SaveRecord[];
  onLoad: (record: SaveRecord) => void;
  onDelete: (key: string) => void;
}) {
  if (saves.length === 0) return null;
  return (
    <section className="border-2 border-pavilion-line bg-pavilion-panel p-4 text-xs">
      <div className="mb-2 text-pavilion-dim">Saved games</div>
      {saves.map((record) => (
        <div
          key={record.key}
          className="flex items-center justify-between border-t border-pavilion-line/50 py-2"
        >
          <span>{record.label}</span>
          <span className="flex gap-2">
            <button
              onClick={() => onLoad(record)}
              className="border border-pavilion-line px-2 py-1 text-pavilion-accent"
            >
              Load
            </button>
            <button
              onClick={() => onDelete(record.key)}
              className="border border-pavilion-line px-2 py-1 text-pavilion-dim"
            >
              Delete
            </button>
          </span>
        </div>
      ))}
    </section>
  );
}
