# Spec 06 — Narrative and Media

Status: **Phase 7a** — event engine, press conferences and tabloids. Storyline chaining and
content packs are pending.

## Purpose

`@pavilion/narrative` turns simulation facts into a living story: colour events, mechanical
world events, interactive storylines, press conferences and newspaper headlines. It is
deterministic (seeded) and I/O-free.

## Model

### Events
`NarrativeEvent` is pure data: id, tier (`flavour` | `context` | `story`), category
(`media` | `board` | `player` | `weather` | `rival` | `fans`), weight, cooldown, optional
declarative `conditions`, optional `effects`, and optional interactive `choices`.

Condition descriptors (`minMorale`, `lastResult`, `maxBoardConfidence`, ...) keep content
data-driven rather than executable predicates.

### Engine
`NarrativeEngine` advances a logical clock (`tick`) and:

- filters events by conditions;
- enforces a per-event cooldown and a per-category cooldown (variety);
- weighted-randomly draws an eligible event;
- `choose(choice)` returns the choice's effects to apply to the context.

`applyEffects` clamps morale, board confidence, reputation and form to `[0, 100]`.

### Press conferences
`generatePressConference` builds questions from context templates (form, star player,
board pressure, fan mood), each with toned options (positive/neutral/aggressive/defensive)
carrying effects and a written reply.

### Tabloids
`generateHeadlines` selects positive/neutral/negative templates and outlets based on team
form for quick, varied back pages.

## Acceptance tests

`packages/narrative/test/narrative.test.ts`:
- declarative conditions evaluate correctly;
- effects clamp;
- per-event cooldowns prevent immediate repeats;
- two engines with the same seed draw the same sequence;
- press conferences produce questions with valid toned options;
- headline tone follows form.

## Shipped content

10 events (3 flavour, 4 context, 3 interactive storylines), 4 press-question templates and
12 headline templates across 4 outlets.
