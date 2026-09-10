# The Pavilion

A deep, offline-first cricket management and career simulation — Test, ODI and T20
cricket, franchise leagues, coach and player careers, and a rich narrative layer.

Built to run entirely on-device (PWA + Capacitor), with a pure, deterministic,
spec-driven simulation engine.

## Status

Phase 0 — foundation. Pure TypeScript engine core (seeded RNG, cricket laws) plus the
calibration harness skeleton.

## Repository

```
specs/                 living specs (source of truth)
packages/engine/       pure simulation core
```

## Development

Requires Node >= 20 and pnpm 10.

```bash
pnpm install
pnpm verify        # format + lint + typecheck + test
pnpm test          # tests only
```

See `AGENTS.md` for the project constitution and conventions.
