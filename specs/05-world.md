# Spec 05 — World Layer

Status: **Phase 4a** — calendar, ratings, development, fixtures. Competitions, contracts,
transfers and full time simulation are pending.

## Purpose

`@pavilion/world` holds the deterministic, I/O-free simulation of everything around a match:
time, ratings, player growth and schedules. It never touches the clock or randomness; all
inputs are explicit and all functions are pure.

## Modules

### calendar
- `CricketDate { year, month, day }` with validation (leap years included).
- Epoch-day conversion (Howard Hinnant's civil-date algorithm), `addDays`, `daysBetween`,
  `compareDates`, `formatDate`.
- `seasonOf` treats seasons as September–August.

Acceptance: leap-day arithmetic, round-tripping, ordering, season labels.

### rankings
- `expectedScore`, `kFactor` (K falls as matches accumulate), `updatePair` (win/loss/draw).
- `rankTeams` sorts by rating.

Acceptance: equal ratings expect 0.5; winners rise, losers fall; draws split; ordering.

### development
- `DevelopmentState`: ability, potential, peak age, form, morale, fitness, experience.
- `developYear` moves ability toward potential before the peak, then declines.
- `applyAppearance` updates form/morale/fitness/workload; `restDays` recovers.
- `injuryRisk` rises with age and fatigue; `isRetired` at the limit.

Acceptance: ability approaches but never passes potential pre-peak; post-peak decline;
fitness bounds; appearance effects; risk monotonicity; retirement.

### competition
- `roundRobin` (single or double) using the circle method with byes for odd counts.
- `fixturesForTeam`.

Acceptance: 6-team double round robin = 30 fixtures, each team 10 with 5 home; no team twice
in a round; odd counts get a bye.

### recruitment
- `runAuction` (IPL-style): players offered best-first, eligible franchises raise by price
  steps until one remains, honouring purse, squad size, overseas cap and a per-slot reserve.
- `signDirect` (BBL-style): validates cap, squad size and overseas limits.

Acceptance: every player assigned at most once; per-franchise spend within purse, squad and
overseas limits; deterministic for a seed; direct signing rejects over-budget, full-squad and
over-overseas moves.

## Tests

`packages/world/test/*` — 22 tests, all pure.
