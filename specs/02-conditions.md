# Spec 02 — Conditions, Venue and Phase

Status: **Phase 1d** — model wired and phase-calibrated; venue coefficients are first-cut
and await per-ground calibration.

## Purpose

Adjust each delivery for the ground, weather, ball age and the stage of the match, so the
same two teams can produce different cricket at Lord's, Galle or Mirpur, and so the fourth
innings is genuinely harder than the first.

## Model

`conditions.ts` produces `DeliveryModifiers` (multiplicative `wicket`, `scoring`,
`boundary`) which `sampleDelivery` folds into its run/wicket weights.

- **Phase (calibrated):** per-format, per-innings tables derived from the segmented Cricsheet
  splits and normalised so the innings-weighted mean is ~1. Test innings 4 is worth ~5%
  fewer runs and ~9% more wickets than innings 1.
- **Venue (first cut):** `VenueProfile` with `paceAssistance`, `spinAssistance` and
  `battingFriendliness` in `[-5, +5]`, matching the original ITC ground model. Pace/spin
  bowlers gain or lose wicket potency; batting-friendly grounds score faster.
- **Weather (first cut):** overcast helps pace (more wickets, fewer runs); hot raises
  scoring; humid lowers it.
- **Ball age:** a new-ball window (first 5 overs) lifts pace wicket chances.

## Data

`VenueProfile` and `MatchConditions` are plain data. A venue dataset will live in
`packages/data` and be validated against a JSON schema; no engine change is needed to add a
ground.

## Acceptance tests

`test/calibration-sim.test.ts`:
- phase test: Test innings 4 RPO < innings 1 RPO and innings 4 dot rate > innings 1.
- overall calibration bands still hold with phases cycled across innings.

## Known gaps

- Venue coefficients are not yet fitted per ground; the segment tool measures venue splits
  but a strength-controlled fit (residual after team quality) is pending.
- Pitch deterioration is discrete by innings; within-innings ball-age wear is a first cut.
- Weather does not yet remove overs or affect the Test time budget.
