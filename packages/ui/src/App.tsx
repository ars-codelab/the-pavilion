import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { engineTeam, teams, venues } from '@pavilion/data';
import { FORMATS, Random, simulateMatch } from '@pavilion/engine';
import type { FormatId, MatchResult, Player, Team } from '@pavilion/engine';

const FORMAT_IDS: FormatId[] = ['test', 'odi', 't20'];

function overs(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function ordinal(value: number): string {
  if (value === 1) return 'st';
  if (value === 2) return 'nd';
  if (value === 3) return 'rd';
  return 'th';
}

interface Simulated {
  result: MatchResult;
  home: Team;
  away: Team;
}

export function App() {
  const [format, setFormat] = useState<FormatId>('t20');
  const [homeId, setHomeId] = useState(teams[0]?.id ?? 'eng-legends');
  const [awayId, setAwayId] = useState(teams[1]?.id ?? 'ind-legends');
  const [venueId, setVenueId] = useState(venues[0]?.id ?? 'lords');
  const [seed, setSeed] = useState('1');
  const [simulated, setSimulated] = useState<Simulated | null>(null);

  const players = useMemo(() => {
    const map = new Map<string, Player>();
    if (simulated === null) return map;
    for (const team of [simulated.home, simulated.away]) {
      for (const player of [...team.battingOrder, ...team.bowlingAttack])
        map.set(player.id, player);
    }
    return map;
  }, [simulated]);

  function play() {
    if (homeId === awayId) return;
    const home = engineTeam(homeId);
    const away = engineTeam(awayId);
    const venue = venues.find((entry) => entry.id === venueId) ?? venues[0];
    const result = simulateMatch(new Random(seed), {
      spec: FORMATS[format],
      home,
      away,
      conditions: { venue },
    });
    setSimulated({ result, home, away });
  }

  const nameOf = (id: string): string => players.get(id)?.surname ?? id;
  const teamName = (id: string): string =>
    simulated === null ? id : simulated.home.id === id ? simulated.home.name : simulated.away.name;

  return (
    <div className="min-h-screen bg-pavilion-bg px-3 py-5 font-mono text-pavilion-ink">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <header className="border-2 border-pavilion-line bg-pavilion-panel px-4 py-3">
          <h1 className="text-xl font-bold tracking-[0.3em] text-pavilion-accent">THE PAVILION</h1>
          <p className="mt-1 text-xs text-pavilion-dim">
            Cricket, simulated ball by ball. Pick your sides and play.
          </p>
        </header>

        <section className="border-2 border-pavilion-line bg-pavilion-panel p-4">
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
                onChange={(event) => setHomeId(event.target.value)}
                className="w-full border border-pavilion-line bg-pavilion-bg px-2 py-2 text-sm"
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
                onChange={(event) => setAwayId(event.target.value)}
                className="w-full border border-pavilion-line bg-pavilion-bg px-2 py-2 text-sm"
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
                onChange={(event) => setVenueId(event.target.value)}
                className="w-full border border-pavilion-line bg-pavilion-bg px-2 py-2 text-sm"
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}, {venue.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Seed">
              <input
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                className="w-full border border-pavilion-line bg-pavilion-bg px-2 py-2 text-sm"
              />
            </Field>
          </div>

          <button
            onClick={play}
            disabled={homeId === awayId}
            className="mt-4 w-full border-2 border-pavilion-accent bg-pavilion-accent px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-pavilion-bg disabled:opacity-40"
          >
            {homeId === awayId ? 'Choose two different sides' : 'Play match'}
          </button>
        </section>

        {simulated !== null && (
          <section className="flex flex-col gap-4">
            <div className="border-2 border-pavilion-line bg-pavilion-panel px-4 py-3">
              <div className="text-xs text-pavilion-dim">
                {teamName(simulated.result.toss.winnerTeamId)} won the toss and chose to{' '}
                {simulated.result.toss.decision}.
              </div>
              <div className="mt-2 border border-pavilion-accent px-3 py-2 text-sm font-bold text-pavilion-accent">
                {simulated.result.resultText}
              </div>
            </div>

            {simulated.result.innings.map((innings, index) => (
              <div key={index} className="border-2 border-pavilion-line bg-pavilion-panel p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-bold">
                    {teamName(innings.battingTeamId)}{' '}
                    <span className="text-pavilion-dim">
                      {index + 1}
                      {ordinal(index + 1)} innings{innings.declared ? ' (dec)' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-pavilion-accent">
                    {innings.state.runs}/{innings.state.wickets}{' '}
                    <span className="text-pavilion-dim">
                      ({overs(innings.state.legalBalls)} ov)
                    </span>
                  </div>
                </div>
                {innings.target !== null && (
                  <div className="mt-1 text-xs text-pavilion-dim">Target {innings.target}</div>
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
                    {innings.state.battingCard.map((batter, batterIndex) => (
                      <tr key={batterIndex} className="border-t border-pavilion-line/50">
                        <td className="py-1">
                          {nameOf(batter.playerId)}
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
                    {innings.bowlers.map((bowler, bowlerIndex) => (
                      <tr key={bowlerIndex} className="border-t border-pavilion-line/50">
                        <td className="py-1">{nameOf(bowler.playerId)}</td>
                        <td className="py-1 text-right">{overs(bowler.legalBalls)}</td>
                        <td className="py-1 text-right">{bowler.maidens}</td>
                        <td className="py-1 text-right">{bowler.runs}</td>
                        <td className="py-1 text-right text-pavilion-accent">{bowler.wickets}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        )}

        <footer className="pb-6 text-center text-[10px] text-pavilion-dim">
          Deterministic engine · seed {seed} · data-driven content
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-pavilion-dim">
      {label}
      {children}
    </label>
  );
}
