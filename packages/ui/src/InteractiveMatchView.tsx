import { ballLabel } from '@pavilion/engine';
import type { BallEvent, InteractiveMatch } from '@pavilion/engine';
import { StadiumBanner } from './LiveMatch';

interface Props {
  session: InteractiveMatch;
  homeId: string;
  awayId: string;
  homeName: string;
  awayName: string;
  venueName: string;
  nameOf: (id: string) => string;
  onChange: () => void;
}

function chipClass(event: BallEvent): string {
  if (event.wicketKind !== null)
    return 'border-pavilion-danger bg-pavilion-danger text-pavilion-bg';
  if (event.runsOffBat === 6) return 'border-pavilion-accent bg-pavilion-accent text-pavilion-bg';
  if (event.runsOffBat === 4) return 'border-pavilion-dim text-pavilion-ink';
  return 'border-pavilion-line text-pavilion-dim';
}

export function InteractiveMatchView({
  session,
  homeId,
  awayId,
  homeName,
  awayName,
  venueName,
  nameOf,
  onChange,
}: Props) {
  const snap = session.snapshot();
  const pending = session.pending;
  const result = session.result;
  const events = session.events;
  const current = events[events.length - 1];
  const battingName =
    snap.battingTeamId === homeId ? homeName : snap.battingTeamId === awayId ? awayName : '—';
  const allPlayers = nameOf;

  const overEvents = current
    ? events.filter(
        (event) => event.inningsIndex === current.inningsIndex && event.over === current.over,
      )
    : [];
  const highlights = events
    .filter((event) => event.highlight !== null)
    .slice(-6)
    .reverse();

  function resolve(optionId: string) {
    if (pending?.kind === 'toss') session.decide({ toss: optionId === 'bat' ? 'bat' : 'field' });
    else if (pending?.kind === 'bowler') session.decide({ bowlerId: optionId });
    else if (pending?.kind === 'batsman') session.decide({ batsmanId: optionId });
    else if (pending?.kind === 'follow-on') session.decide({ enforceFollowOn: optionId === 'yes' });
    onChange();
  }

  return (
    <section className="border-2 border-pavilion-line bg-pavilion-panel">
      <div className="flex items-center justify-between border-b border-pavilion-line px-3 py-1 text-[10px] uppercase tracking-widest text-pavilion-dim">
        <span>
          {homeName} v {awayName} · {venueName}
        </span>
        <span>{result !== null ? 'result' : 'live'}</span>
      </div>

      <StadiumBanner />

      <div className="flex items-center justify-between border-b border-pavilion-line px-4 py-2">
        <div className="text-xs text-pavilion-dim">
          Innings {snap.inningsNumber} · {battingName}
          {snap.target !== null ? ` · target ${snap.target}` : ''}
        </div>
        <div className="text-xl font-bold text-pavilion-accent">
          {snap.score}/{snap.wickets}
          <span className="ml-2 text-xs font-normal text-pavilion-dim">{snap.oversText} ov</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-2 text-xs">
        <div>
          <div className="text-[10px] text-pavilion-dim">Striker</div>
          <div>
            {snap.strikerId === null ? '—' : allPlayers(snap.strikerId)}{' '}
            <span className="text-pavilion-accent">{current?.batterRuns ?? 0}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-pavilion-dim">Non-striker</div>
          <div>{snap.nonStrikerId === null ? '—' : allPlayers(snap.nonStrikerId)}</div>
        </div>
        <div className="col-span-2">
          <div className="text-[10px] text-pavilion-dim">Bowler</div>
          <div>{snap.bowlerId === null ? '—' : allPlayers(snap.bowlerId)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-t border-pavilion-line px-3 py-2">
        {overEvents.length === 0 ? (
          <span className="text-[10px] text-pavilion-dim">This over</span>
        ) : (
          overEvents.map((event, index) => (
            <span
              key={`${events.length}-${index}`}
              className={`ball-chip inline-flex h-7 w-7 items-center justify-center border text-xs ${chipClass(event)}`}
            >
              {ballLabel(event)}
            </span>
          ))
        )}
      </div>

      {pending !== null && (
        <div className="border-t-2 border-pavilion-accent px-3 py-3">
          <div className="mb-2 text-xs font-bold text-pavilion-accent">{pending.prompt}</div>
          <div className="flex flex-wrap gap-2">
            {pending.options.map((option) => (
              <button
                key={option.id}
                onClick={() => resolve(option.id)}
                className="border border-pavilion-accent px-3 py-2 text-left text-xs text-pavilion-ink"
              >
                {option.label}
                {option.detail !== undefined && (
                  <span className="ml-2 text-[10px] text-pavilion-dim">{option.detail}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {result === null && pending === null && (
        <div className="flex flex-wrap gap-2 border-t border-pavilion-line px-3 py-3">
          <button
            onClick={() => {
              session.nextOver();
              onChange();
            }}
            className="border border-pavilion-accent px-3 py-2 text-xs uppercase tracking-widest text-pavilion-accent"
          >
            Next over
          </button>
          <button
            onClick={() => {
              session.simulateOvers(5);
              onChange();
            }}
            className="border border-pavilion-line px-3 py-2 text-xs uppercase tracking-widest text-pavilion-dim"
          >
            +5 overs
          </button>
          <button
            onClick={() => {
              session.simulateOvers(10);
              onChange();
            }}
            className="border border-pavilion-line px-3 py-2 text-xs uppercase tracking-widest text-pavilion-dim"
          >
            +10 overs
          </button>
          <button
            onClick={() => {
              session.simulateToEnd();
              onChange();
            }}
            className="border border-pavilion-line px-3 py-2 text-xs uppercase tracking-widest text-pavilion-dim"
          >
            Sim to result
          </button>
          {snap.canDeclare && (
            <button
              onClick={() => {
                session.declare();
                onChange();
              }}
              className="border border-pavilion-danger px-3 py-2 text-xs uppercase tracking-widest text-pavilion-danger"
            >
              Declare
            </button>
          )}
        </div>
      )}

      {result === null && (
        <div className="grid grid-cols-1 gap-2 border-t border-pavilion-line px-3 py-3 text-xs sm:grid-cols-2">
          <label className="flex items-center gap-2">
            <span className="w-24 text-pavilion-dim">Bat aggression</span>
            <input
              type="range"
              min={1}
              max={10}
              value={snap.battingAggression}
              onChange={(event) => {
                session.setAggression('batting', Number(event.target.value));
                onChange();
              }}
              className="flex-1"
            />
            <span className="w-6 text-right text-pavilion-accent">{snap.battingAggression}</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="w-24 text-pavilion-dim">Bowl aggression</span>
            <input
              type="range"
              min={1}
              max={10}
              value={snap.bowlingAggression}
              onChange={(event) => {
                session.setAggression('bowling', Number(event.target.value));
                onChange();
              }}
              className="flex-1"
            />
            <span className="w-6 text-right text-pavilion-accent">{snap.bowlingAggression}</span>
          </label>
        </div>
      )}

      {result !== null && (
        <div className="border-t-2 border-pavilion-accent px-3 py-3 text-sm font-bold text-pavilion-accent">
          {result.resultText}
        </div>
      )}

      {highlights.length > 0 && (
        <div className="border-t border-pavilion-line px-3 py-2 text-xs">
          <div className="mb-1 text-[10px] text-pavilion-dim">Highlights</div>
          {highlights.map((event, index) => (
            <div key={index} className="border-t border-pavilion-line/40 py-1">
              {event.wicketKind !== null
                ? `WICKET! ${allPlayers(event.batterId)} out (${event.wicketKind}) — ${event.score}/${event.wickets}`
                : event.runsOffBat === 6
                  ? `SIX! ${allPlayers(event.batterId)} — ${event.score}/${event.wickets}`
                  : `FOUR! ${allPlayers(event.batterId)}`}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
