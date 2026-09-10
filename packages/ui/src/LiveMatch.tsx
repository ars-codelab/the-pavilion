import { ballLabel } from '@pavilion/engine';
import type { BallEvent, MatchResult, Team } from '@pavilion/engine';

interface LiveMatchProps {
  result: MatchResult;
  home: Team;
  away: Team;
  venueName: string;
  events: BallEvent[];
  revealed: number;
  onReveal: (count: number) => void;
  nameOf: (id: string) => string;
}

function nextOverCount(events: BallEvent[], revealed: number): number {
  if (revealed >= events.length) return 0;
  const start = events[revealed];
  if (start === undefined) return 0;
  let index = revealed;
  while (
    index < events.length &&
    events[index]?.inningsIndex === start.inningsIndex &&
    events[index]?.over === start.over
  ) {
    index += 1;
  }
  return index - revealed;
}

function chipClass(event: BallEvent): string {
  if (event.wicketKind !== null)
    return 'border-pavilion-danger bg-pavilion-danger text-pavilion-bg';
  if (event.runsOffBat === 6) return 'border-pavilion-accent bg-pavilion-accent text-pavilion-bg';
  if (event.runsOffBat === 4) return 'border-pavilion-dim text-pavilion-ink';
  if (event.extraKind !== null) return 'border-pavilion-line text-pavilion-dim';
  return 'border-pavilion-line text-pavilion-dim';
}

export function StadiumBanner() {
  return (
    <svg viewBox="0 0 320 120" className="w-full" role="img" aria-label="Cricket ground">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16324a" />
          <stop offset="100%" stopColor="#0e1a14" />
        </linearGradient>
      </defs>
      <rect width="320" height="120" fill="url(#sky)" />
      <rect y="46" width="320" height="18" fill="#1d3327" />
      <rect y="40" width="320" height="8" fill="#2c4736" />
      {[30, 90, 160, 230, 290].map((x) => (
        <rect key={x} x={x} y="30" width="3" height="14" fill="#2c4736" />
      ))}
      <ellipse cx="160" cy="96" rx="150" ry="34" fill="#1a3a24" />
      <ellipse cx="160" cy="96" rx="150" ry="34" fill="none" stroke="#2c4736" strokeWidth="2" />
      <rect x="150" y="70" width="20" height="42" fill="#b79b6a" opacity="0.85" />
      <rect x="156" y="72" width="2" height="10" fill="#e8e2cf" />
      <rect x="160" y="72" width="2" height="10" fill="#e8e2cf" />
      <rect x="164" y="72" width="2" height="10" fill="#e8e2cf" />
      <rect x="158" y="106" width="4" height="8" fill="#8fae97" />
      <circle cx="176" cy="104" r="3" fill="#c0562f" />
    </svg>
  );
}

export function LiveMatch({
  result,
  home,
  away,
  venueName,
  events,
  revealed,
  onReveal,
  nameOf,
}: LiveMatchProps) {
  const total = events.length;
  const current = revealed > 0 ? events[revealed - 1] : undefined;
  const inningsIndex = current?.inningsIndex ?? 0;
  const battingTeamId =
    current?.battingTeamId ?? result.innings[inningsIndex]?.battingTeamId ?? home.id;
  const battingName = battingTeamId === home.id ? home.name : away.name;

  const overEvents = events
    .slice(0, revealed)
    .filter((event) => event.inningsIndex === inningsIndex && event.over === (current?.over ?? -1));

  const highlights = events
    .slice(0, revealed)
    .filter((event) => event.highlight !== null)
    .slice(-8)
    .reverse();

  const oversText = current === undefined ? '0.0' : `${current.over}.${current.ballInOver}`;

  function advanceOvers(count: number) {
    let next = revealed;
    for (let i = 0; i < count; i += 1) {
      const step = nextOverCount(events, next);
      if (step === 0) break;
      next += step;
    }
    onReveal(next);
  }

  return (
    <section className="border-2 border-pavilion-line bg-pavilion-panel">
      <div className="border-b border-pavilion-line px-3 py-1 text-[10px] uppercase tracking-widest text-pavilion-dim">
        {home.name} v {away.name} · {venueName} · live
      </div>

      <StadiumBanner />

      <div className="flex items-center justify-between border-b border-pavilion-line px-4 py-2">
        <div className="text-xs text-pavilion-dim">
          {battingName} · live {inningsIndex + 1}
          {result.innings[inningsIndex]?.target !== null &&
          result.innings[inningsIndex]?.target !== undefined
            ? ` · target ${result.innings[inningsIndex]?.target}`
            : ''}
        </div>
        <div className="text-xl font-bold text-pavilion-accent">
          {current === undefined ? '0/0' : `${current.score}/${current.wickets}`}
          <span className="ml-2 text-xs font-normal text-pavilion-dim">{oversText} ov</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-2 text-xs">
        <div>
          <div className="text-[10px] text-pavilion-dim">Striker</div>
          <div>
            {current === undefined ? '—' : nameOf(current.batterId)}{' '}
            <span className="text-pavilion-accent">
              {current === undefined ? '' : current.batterRuns}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-pavilion-dim">Non-striker</div>
          <div>{current === undefined ? '—' : nameOf(current.nonStrikerId)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-[10px] text-pavilion-dim">Bowler</div>
          <div>{current === undefined ? '—' : nameOf(current.bowlerId)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-t border-pavilion-line px-3 py-2">
        {overEvents.length === 0 ? (
          <span className="text-[10px] text-pavilion-dim">This over</span>
        ) : (
          overEvents.map((event, index) => (
            <span
              key={`${revealed}-${index}`}
              className={`ball-chip inline-flex h-7 w-7 items-center justify-center border text-xs ${chipClass(event)}`}
            >
              {ballLabel(event)}
            </span>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-pavilion-line px-3 py-3">
        <button
          onClick={() => advanceOvers(1)}
          disabled={revealed >= total}
          className="border border-pavilion-accent px-3 py-2 text-xs uppercase tracking-widest text-pavilion-accent disabled:opacity-40"
        >
          Next over
        </button>
        <button
          onClick={() => advanceOvers(5)}
          disabled={revealed >= total}
          className="border border-pavilion-line px-3 py-2 text-xs uppercase tracking-widest text-pavilion-dim disabled:opacity-40"
        >
          +5 overs
        </button>
        <button
          onClick={() => advanceOvers(10)}
          disabled={revealed >= total}
          className="border border-pavilion-line px-3 py-2 text-xs uppercase tracking-widest text-pavilion-dim disabled:opacity-40"
        >
          +10 overs
        </button>
        <button
          onClick={() => onReveal(total)}
          className="border border-pavilion-line px-3 py-2 text-xs uppercase tracking-widest text-pavilion-dim"
        >
          Sim to result
        </button>
      </div>

      {highlights.length > 0 && (
        <div className="border-t border-pavilion-line px-3 py-2 text-xs">
          <div className="mb-1 text-[10px] text-pavilion-dim">Highlights</div>
          {highlights.map((event, index) => (
            <div key={index} className="border-t border-pavilion-line/40 py-1">
              {event.wicketKind !== null
                ? `WICKET! ${nameOf(event.batterId)} out (${event.wicketKind}), ${event.score}/${event.wickets}`
                : event.runsOffBat === 6
                  ? `SIX! ${nameOf(event.batterId)} goes big — ${event.score}/${event.wickets}`
                  : `FOUR! ${nameOf(event.batterId)} finds the rope`}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
