# Spec 01 — Match Orchestration

Status: **Phase 1c** — implemented for Test, ODI and T20.

## Purpose

`simulateMatch` turns two teams into a complete, deterministic match result on top of the
innings simulator: toss, innings sequencing, follow-on, declarations, chases, time budget
and result.

## Invariants

- Same seed + teams + format => identical match.
- The Test time budget (days x overs/day) is never exceeded.
- A result is always returned: win (runs/wickets/innings), tie or draw.
- A 4th-innings chase stops the instant the target is reached.
- Limited-overs chases always end in a win or tie (no draw) until weather/DLS exist.

## Toss and innings order

- Toss winner is simulated (or supplied) and chooses bat or field. Test tosses favour
  batting, limited-overs tosses favour fielding.
- Normal order is `[batFirst, batSecond, batFirst, batSecond]`.
- **Follow-on** is enforced when the side batting second is all out and trails by at least
  `followOnRuns` (default 200). The order then becomes `[batFirst, batSecond, batSecond,
  batFirst]` and an innings victory is possible.

## Declarations and time

- The side batting third declares once its aggregate lead reaches ~300 (only when already
  leading).
- Test matches have a ball budget of `maxDays x maxOversPerDay x ballsPerOver`; each innings
  is capped at the overs remaining. Exhausting the budget yields a draw.

## Results

- Chase reached => `won by N wickets`.
- Chase all out short => `won by N runs`.
- Follow-on not overturned => `won by an innings and N runs`.
- Scores level with the last side all out => `Match tied`.
- Time/weather exhausted => `Match drawn`.

## Acceptance tests

`test/match-sim.test.ts`:
- T20/ODI/Test complete with valid results and legal innings lengths.
- Deterministic for a seed.
- Test time budget never exceeded.
- Stronger teams win a clear majority of T20s.

## Known gaps (tracked)

- Draw rate is currently near zero because weather, over-rate loss and within-match pitch
  deterioration are not modelled yet; these arrive with the conditions/time slice and will
  be calibrated to real draw rates.
- DLS, innings breaks and per-day scheduling are pending.
