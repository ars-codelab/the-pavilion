# Spec 08 — Presentation Engine

Status: **Phase 6a** — data-driven timeline and scene builders for pre/post-match and
interviews. The pixel-art renderer is pending.

## Purpose

`@pavilion/presentation` decouples story presentation from gameplay. It turns a match or a
press question into a **scene** (background, actors, cues) and runs it as a deterministic
**timeline**. A renderer (later: PixiJS pixel art) simply draws the timeline state; the same
engine drives pre-match, post-match, interviews and press conferences.

## Model

- `Actor`: id, name, portrait key, expression, stage position.
- `Cue`: `say`, `enter`, `exit`, `background`, `wait`, `effect`, `choice`.
- `Scene`: id, background, actors, cues.
- `TimelineState`: current background, actors, cue index, spoken lines, pending choice,
  accumulated effects, done.
- `startScene` / `tick` / `playScene` (auto-advance, supplying choice ids) / `choiceOptions`.

Choices carry `Effects` (from narrative) which accumulate in `TimelineState.effects`, ready to
apply to career or team state.

## Builders

- `preMatchScene(match, venueName, formatName)` — welcome, toss, ready to play.
- `postMatchScene(match)` — result, top scorer and best bowling from the scorecard.
- `interviewScene(question)` — a press question becomes a dialogue plus a choice cue whose
  options are the player's answers.

## Acceptance tests

`packages/presentation/test/presentation.test.ts`:
- staging (background/enter/exit), dialogue and expression changes;
- choice gating and effect accumulation;
- scenes played to completion;
- pre/post-match scenes include expected content;
- interviews expose a pending choice and resolve effects.

## Next

- Pixel-art sprite + atlas renderer (PixiJS) consuming `TimelineState`.
- Asset pipeline: character specs, sprite sheets, atlas packing, manifest validation.
- Wire narrative events and press conferences into a career screen.
