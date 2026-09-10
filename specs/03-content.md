# Spec 03 — Content and Data

Status: **Phase 1e** — schemas, validation, venues and four all-time XIs; playable CLI.

## Purpose

Content is data, not code. Players, teams and venues are JSON validated at load time against
hand-written schemas in `packages/data`. New teams and grounds are added without engine
changes.

## Schemas

- `RawVenue`: id, name, city, country, and `paceAssistance` / `spinAssistance` /
  `battingFriendliness` in `[-5, 5]` (matching the original ITC ground model).
- `RawPlayer`: id, name, initials, batting role/style, bowling type/role, fielding type,
  wicket-keeper flag, and ratings `bat`, `bowlSkill`, `fieldSkill`, `batAgg`, `bowlAgg`
  in `[0, 100]`.
- `RawTeam`: id, name, nationality and at least 11 players with unique ids.

Validation runs on import; invalid content throws with a list of every problem (seen in
practice: a keeper authored with an invalid batting style was rejected).

## Conversion

`toEngineTeam` sorts a batting order by role then batting skill, and derives a bowling attack
from the preferred bowlers (new-ball, main, support, ...) sorted by bowling skill, capped at
six. `toEnginePlayer` maps raw fields onto the engine `Player`.

## Data shipped

- 8 venues: Lord's, MCG, Galle, Mirpur, Eden Gardens, Newlands, Wankhede, Gaddafi.
- 4 all-time XIs: England, India, Australia, West Indies legends.

## CLI

`tools/play` simulates a match and prints the toss, innings totals, bowling figures, targets
and result:

```
pnpm play test eng-legends ind-legends lords 7
```

Example output: England 551, India 352, England 105/4 dec, India 158 chasing 305 =>
England won by 146 runs.

## Acceptance tests

`packages/data/test/data.test.ts`: all shipped content validates; teams convert to playable
engine teams (11 batters, >=4 bowlers, openers first, new-ball first); unknown ids throw.

## Known gaps

- Full per-batter scorecards need `InningsState` to retain a batting card (next engine slice).
- Ratings are hand-authored, not yet fitted from career data.
- More eras, contemporary squads and franchise teams to follow.
