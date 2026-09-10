# The Pavilion

An offline-first cricket management and career simulation — Test, ODI and T20 cricket,
franchise auctions, coach and player careers, and a narrative layer. Built on a pure,
deterministic, calibrated simulation engine.

## Download & play

**[Download the latest release »](https://github.com/ars-codelab/the-pavilion/releases/latest)**

- **The-Pavilion.apk** — Android app. Copy to your phone, open it, allow install from this
  source, and play. Runs **fully offline**, no server required.
- **pavilion-web.tar.gz** — static PWA build. Serve over HTTPS (or localhost) and use
  "Add to Home Screen".

## Features

- **All three formats** — Test, ODI and T20 with format-aware laws (declarations, follow-on,
  powerplays, chases, overs budget).
- **Calibrated engine** — ball-by-ball outcome model tuned against real Cricsheet data
  (men's full-member matches) for runs/over, dots, boundaries and balls/wicket.
- **Conditions** — venue character (pace/spin/batting), weather, new-ball window and
  within-match pitch deterioration.
- **Careers** — coach mode (objectives, board confidence, reputation, job market) and player
  mode (real match returns, development, form, fitness, retirement), simulated across seasons.
- **Competitions** — series, round-robin leagues with a table and Elo ratings, plus IPL-style
  auctions and BBL-style direct signing.
- **Narrative** — data-driven events, press conferences and tabloid headlines, presented via a
  scene/timeline engine (pre-match, post-match, interviews).
- **Content as data** — JSON schemas validated at load; 6 teams (legends + contemporary),
  8 venues, 101 marquee players with portrait specs.
- **Offline & installable** — PWA service worker + IndexedDB saves; deterministic seeded
  matches you can replay exactly.

## Repository layout

```
specs/                 living specs (source of truth for behaviour)
packages/engine/       pure simulation core (no I/O)
packages/world/        calendar, competitions, contracts, development, rankings, recruitment
packages/career/       coach and player career logic
packages/narrative/    events, media, press conferences
packages/presentation/ scene/timeline engine
packages/data/         squads, grounds, league data, content packs
packages/ui/           React + Tailwind app shell (PWA + Capacitor)
tools/                 asset pipeline, calibration, CLI, release
```

## Development

Requires Node 20+ and pnpm 10.

```bash
pnpm install
pnpm verify                 # format + lint + build + typecheck + tests
pnpm dev                    # run the web app (http://localhost:5173)
pnpm play test eng-legends ind-legends lords 7   # simulate a match in the terminal
pnpm calibrate <dir> 2018 male --segments        # real-vs-sim calibration report
pnpm assets                 # generate the marquee portrait manifest
```

### Building the Android APK

Requires JDK 17 and the Android SDK (`platforms;android-34`, `build-tools;34.0.0`).

```bash
pnpm release                # web build -> Capacitor sync -> Gradle -> release/
```

## Status

Early but playable. See `specs/` for the current design and known gaps. Notable next steps:
weather/time-loss for realistic Test draws, the pixel-art renderer, and franchise/domestic
team data.

## Licence

Free and non-commercial. Player names are used for a non-commercial fan project; content is
data-driven and can be swapped or edited.
