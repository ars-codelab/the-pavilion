# The Pavilion — Project Constitution

This file is the durable source of truth for how the project is built. Read it before
writing code. It is intentionally short; deeper detail lives in `specs/`.

## What we are building

**The Pavilion** — a deep, offline-first cricket management and career simulation for
mobile and web, covering Test, ODI and T20 cricket, plus franchise leagues (IPL auction,
BBL direct signing), with both Coach/Manager and Player careers and a rich narrative layer
(press conferences, tabloids, interviews, pre/post-match presentation).

## Non-negotiable invariants

1. **The engine is pure and deterministic.**
   - `packages/engine` must not import DOM, Node, React, network, time, or randomness
     sources. All randomness flows through the seeded `Random` class.
   - Given the same seed and inputs, a match must replay to the exact same result.
   - Never call `Math.random()`, `Date.now()` or `new Date()` inside the engine.

2. **Laws are enforced by construction.**
   - Cricket rules (balls per over, strike rotation, innings termination, extras) live in
     pure reducers and are covered by property-based tests.
   - An illegal match state must be impossible to reach via the public API.

3. **Content is data, not code.**
   - Players, grounds, leagues, rule sets and narrative events are JSON validated against
     schemas. New leagues/eras/content must never require engine changes.

4. **Spec-first, test-everywhere.**
   - Every subsystem has a spec in `specs/`. Every spec lists acceptance tests.
   - Work proceeds in vertical slices: failing test -> implement -> green -> calibrate.
   - Calibration (realism) is measured against real data, never eyeballed.

5. **Mobile budgets are real.**
   - Engine computations that touch many matches run in a Web Worker.
   - Sprite atlases <= 2048px, integer pixel scaling, lazy loading, no unbounded caches.
   - Total shipped audio is small; the game is text-based and must work fully offline.

6. **Text first.**
   - No voice acting. Presentation is pixel art + text. Accessibility (screen-reader
     labels, scalable text) is required for UI.

## Conventions

- TypeScript strict mode, ESM, `verbatimModuleSyntax`. Prefer `type` imports.
- No comments in source unless they explain *why* (a non-obvious constraint or decision).
  Do not narrate *what* the code does.
- 2-space indent, single quotes, trailing commas, 100-col width (Prettier owns this).
- File names: `kebab-case.ts`. Types `PascalCase`, values `camelCase`, constants
  `SCREAMING_SNAKE_CASE` only for true constants.
- Public package entry points re-export a small, intentional surface via `src/index.ts`.
- Avoid `any`. Use `unknown` + narrowing at boundaries (e.g. JSON parsing).

## Repository layout

```
specs/                 living specs; source of truth for behaviour
packages/engine/       pure simulation core (no I/O)
packages/world/        calendar, competitions, contracts, aging, rankings   (later)
packages/career/       player & coach career logic                          (later)
packages/narrative/    events, media, press conferences                     (later)
packages/presentation/ cutscene/timeline engine, pixi scenes                (later)
packages/ui/           React + Tailwind app shell                           (later)
packages/data/         squads, grounds, league data, content packs          (later)
tools/                 asset pipeline + calibration scripts
```

## Definition of done for any slice

- Spec updated (or written first) in `specs/`.
- Unit + property tests where applicable; calibration where the slice affects realism.
- `pnpm verify` passes (format, lint, typecheck, test).
- No new invariants violated. Public types documented in the spec.

## Commit discipline

- Commit in small, coherent steps. Each commit should build and pass tests.
- Commit message format: `type(scope): summary` (e.g. `feat(engine): seeded RNG`,
  `test(engine): innings invariants`, `docs(spec): engine model`).
- Never commit secrets, large data dumps, or generated `node_modules`.
