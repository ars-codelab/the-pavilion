# Spec 00 — Engine Core

Status: **Phase 0 in progress** (RNG + law foundations). Delivery probability model and
calibration are Phase 1.

## Purpose

`@pavilion/engine` is the pure, deterministic heart of The Pavilion. It turns two teams,
a format, conditions and a seed into a complete, reproducible match. It has no I/O, no
clock, no DOM, and no ambient randomness.

## Invariants

- **I1 Determinism.** Same seed + same inputs => identical match, ball for ball.
- **I2 Purity.** No `Math.random`, `Date.now`, `new Date`, DOM, Node or network imports.
- **I3 Legal states only.** Public API cannot produce a state with negative runs, more than
  10 wickets, or a completed innings that is not marked complete.
- **I4 Strike correctness.** Strike rotates on odd cumulative runs (bat + byes + leg byes)
  and at the end of every completed over.
- **I5 Extras.** Wides and no-balls add runs but are not legal balls; byes and leg byes are
  legal balls and do not count to the batter.

## Module map

```
src/rng.ts          seeded PRNG (sfc32) + Random helper API + state save/restore
src/types.ts        domain types (Player, FormatSpec, innings/delivery state)
src/match.ts        pure cricket-law reducers (applyDelivery, innings completion)
src/calibration/    Cricsheet JSON parser + aggregate stats (realism harness)
src/index.ts        intentional public surface
```

## Seeded RNG

- Algorithm: **sfc32** (small fast counter), 128-bit state, seeded via **cyrb128** hash.
- `Random` exposes: `next()`, `int(min,max)`, `chance(p)`, `pick(arr)`, `weighted(entries)`,
  `shuffle(arr)`, `fork(label)`, `getState()`, `setState(state)`.
- `next()` returns a float in `[0, 1)`.
- `fork(label)` returns a new independent stream derived deterministically from the current
  state and the label, so subsystems never couple.
- State is serialisable so a match or career can be saved and resumed exactly.

Acceptance tests:
- same seed => identical sequence; different seeds => different sequence.
- `next()` always in `[0,1)`, `int()` always in bounds, `pick()` always returns an element.
- `getState`/`setState` resumes the exact sequence.
- `fork` is deterministic and independent of parent advancement.

## Domain types (initial)

- `Player`: identity, nationality, batting position role, batting style, bowling type,
  bowling role, fielding type, `PlayerRatings` (batting/bowling/fielding/aggression).
- `FormatSpec`: balls per over, innings per team, over/day caps, declarations, follow-on,
  powerplay/free hit, DLS, new-ball overs, ball colour, days.
- `ResolvedDelivery`: `runsOffBat`, `extra` (wide|noball|bye|legbye), `wicket`
  (bowled|caught|lbw|run-out|stumped|hit-wicket|retired) and dismissed end.
- `InningsState`: totals, wickets, legal balls, two batter states, striker index, next
  batter index, batting order, closed flag.

## Law reducers

`applyDelivery(state, delivery, ballsPerOver)` is pure and returns a new state:

1. Total runs = `runsOffBat` + all extra runs.
2. Wides/no-balls do not increment `legalBalls`; byes/leg-byes do.
3. `runsOffBat` accrues to the striker; fours/sixes recorded for 4/6.
4. A wicket increments `wickets` and closes the innings at 10.
5. Strike rotates on odd cumulative running runs; the over-end swap is applied after the
   last legal ball of the over and only if the innings is not closed.

Acceptance tests (property-based, fast-check):
- totals never negative; wickets in `[0,10]`; legal balls never negative.
- `legalBalls` increments by exactly 1 iff the ball is legal.
- 10 wickets => `closed === true`.
- odd running runs on a non-over-ending legal ball toggles the striker.
- the over-end swap happens after every `ballsPerOver` legal balls.

## Calibration harness

`calibration/cricsheet.ts` parses the Cricsheet JSON match format and reduces an innings to
aggregate facts (runs, wickets, legal balls, deliveries, dot balls, boundaries, extras).
`calibration/aggregate.ts` combines matches into distributions. `tools/calibration` compares
real data against the simulator.

Acceptance tests:
- parses a fixture match and reproduces known innings totals.
- rejects malformed input via narrowing (no `any`).

### Targets (Cricsheet men's full-member, since 2018)

| Format | Runs/inn | Wkts/inn | RPO | Balls/wkt | Dot | Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Test | 264.4 | 8.83 | 3.34 | 53.8 | 0.725 | 0.065 |
| ODI | 241.0 | 7.34 | 5.60 | 35.2 | 0.509 | 0.102 |
| T20 | 154.2 | 6.29 | 8.43 | 17.5 | 0.360 | 0.171 |

`runsPerInnings` is expected to run high until declarations, chases and follow-ons are added
(Phase 4); per-ball rates (RPO, balls/wicket, dot, boundary) are the Phase 1 acceptance gate
and are asserted in `test/calibration-sim.test.ts`.

### Calibration dimensions (measured, not yet modelled)

The calibration tool accepts `--segments` and breaks real innings down by innings number,
month, team tier and venue. Observed spread is large, so the Phase 1 single global table is a
baseline only. **None of these are modelled yet.** Findings (men's full members, since 2018):

- **Innings number (Test):** RPO 3.37 / 3.32 / 3.38 / 3.20 and dot 0.723 / 0.727 / 0.715 /
  0.739 for innings 1-4; 4th-innings scoring and boundary rates fall, dot rate rises.
- **Team strength (RPO spread):** Test England 3.69 vs West Indies 2.98 / Zimbabwe 2.94;
  ODI India 5.92 / England 6.13 vs Zimbabwe 4.84; T20 India 9.14 / England 9.09 vs
  Zimbabwe 7.42 / Bangladesh 7.58.
- **Venue:** Test Galle dot 0.692 / boundary 0.058 vs MCG boundary 0.049 / dot 0.744;
  ODI Mirpur 4.88 RPO vs Pallekele 5.73; T20 Mirpur 6.91 RPO vs Gaddafi 8.45.
- **Month/season:** Test July 3.52 RPO vs March 3.13; T20 February 8.83 vs October 8.01.

Modelling plan (each as a data-driven, calibrated multiplier — never eyeballed):

1. `Team strength` — derive an attack/batting rating from the selected XI and feed a
   strength differential into the outcome model.
2. `Venue` — data record per ground: size, pace/spin assistance, typical pitch/bounce.
3. `Conditions` — pitch, bounce, ball age, outfield, weather; also drive within-match
   deterioration.
4. `Innings phase` — innings number and chase pressure (target/required rate).
5. `Season` — small climate adjustment per month/region.

Each dimension is added only once a segmented calibration test can assert it.

## Delivery outcome model

`outcome.ts` maps a delivery context (format, batter skill/aggression/style, bowler
skill/aggression) to a sampled `ResolvedDelivery`:

1. With probability `extraRate` a wide or no-ball occurs (no legal ball).
2. Otherwise a per-format baseline distribution over `{0,1,2,3,4,6, wicket}` is adjusted:
   - `wicketFactor` from skill difference, aggression (pressure) and batting style;
   - `runBoost` on all scoring weight from skill and pressure;
   - `boundaryBoost` on fours and sixes from style and pressure.
3. The distribution is normalised against the wicket probability and sampled.

## Out of scope (later phases)

Multi-day scheduling, toss/declarations/follow-on/DLS, AI captaincy, conditions, weather,
career/world state, narrative. Each gets its own spec.
