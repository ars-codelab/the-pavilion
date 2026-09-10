# Spec 07 — Career Layer

Status: **Phase 5a** — coach career (objectives, reputation, job market) and player career
(progression, milestones, retirement). Full season orchestration and contract negotiation
are pending.

## Purpose

`@pavilion/career` sits on top of `@pavilion/world` to model the two career modes: a
Coach/Manager and an individual Player. It is pure and deterministic.

## Coach career

- `createCoach` seeds reputation 50, board confidence 60 and a set of board objectives.
- `recordResult` moves reputation and board confidence by outcome (win/lose/draw/tie) and
  credits the `win-matches` objective on a win.
- Objectives are generated from templates (`win-matches`, `win-series`, `develop-youth`) with
  random targets and a deadline; `recordObjectiveProgress` advances them; `settleSeason`
  marks unmet objectives failed.
- Job market: `generateJobOffers` (other teams, reputation gate, salary), `canAccept`,
  `acceptJob` (resets board confidence and objectives).

## Player career

- `createPlayerCareer` starts a player at ~55% of potential.
- `recordAppearance` updates runs/wickets, fifties, hundreds and five-wicket hauls, and feeds
  form/morale/fitness/experience through the world development model.
- `advanceYear` develops, ages and flags retirement.
- `battingAverage` / `bowlingAverage` helpers.

## Acceptance tests

`packages/career/test/career.test.ts`:
- wins raise and losses lower confidence; win objectives advance.
- job offers are unique, exclude the current team, and respect the reputation gate.
- milestones (100/50/5 wickets) are recorded; ability rises then declines; retirement at 40.

## Season integration

- `playCoachSeason(random, coach, input)` runs a full `simulateSeason` and applies every
  match involving the coach's team to their reputation, board confidence and win objectives;
  winning the title credits the `win-series` objective; `seasons` increments.
- `playPlayerSeason(random, career, input)` runs the season and credits the player's **real**
  match returns (from batting cards and bowling figures where `playerId` matches) as
  appearances, then advances the year (development, aging, retirement).

Acceptance tests (`packages/career/test/season-career.test.ts`):
- a coach plays exactly their team's matches; reputation changes; seasons increment.
- a player's matches, runs and wickets equal the season totals; age advances.

## Next

- Contracts, negotiation and transfers.
- Wiring narrative effects (press conferences, tabloids) into career state.
- Career screens in the UI (coach hub, player profile, calendar, records).
