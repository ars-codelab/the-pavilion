# Spec 09 — Assets, Pixel Art and Marquee Portraits

Status: **Phase 8a** — marquee dataset, portrait specs and manifest generator. The actual
sprite art, atlas packing and PixiJS renderer are pending (art production, not code).

## Art direction

Pixel art, text-first presentation, no voice. Palette (from the UI): deep green `#0e1a14`,
panel `#15261c`, line `#2c4736`, cream `#e8e2cf`, mustard `#d9a441`. Integer pixel scaling,
nearest-neighbour sampling. Atlas cap 2048px.

## Marquee players

`packages/data/src/data/marquee.json` holds ~100 marquee players across eras and nations
(id, name, country, era, role). `derivePortrait` produces a `PortraitSpec` for each
(`skinTone`, `hairStyle`, `hairColour`, `facialHair`, `build`, `headgear`). A specific
`portrait` override can be added per player for a closer likeness; otherwise the descriptor
is derived deterministically from the player id and country. The list is expected to grow to
150–200.

> Legal note: likenesses of real people carry more risk than names. Portraits are stylised
> pixel descriptors, not photographic likenesses; fall back to the derived spec where an
> explicit likeness is unavailable or inadvisable.

## Pipeline

`tools/asset-pipeline` (`pnpm assets`) reads the marquee list and writes
`assets/generated/portraits.json` (gitignored): a manifest of portrait specs plus atlas cell
coordinates (32x48 cells on a 2048px atlas, 64 columns).

Art production steps (documented, run by the artist/agent):

1. **Style lock** — one reference sheet and palette for all portraits.
2. **Consistent character** — reference-locked generation per player from the portrait spec.
3. **Pixel post-process** — background matte, shared palette quantisation, grid snap,
   alpha-weighted centroid anchor alignment (prevents jitter).
4. **Atlas** — pack cells to the manifest coordinates, export PNG + JSON.

## Runtime plan

The renderer (PixiJS) draws `TimelineState` from `@pavilion/presentation`; portraits are
referenced by `playerId`/`portrait` key and resolved from the atlas manifest. Dialogue,
staging, expression changes and choices already come from the presentation engine.

## Acceptance

- `packages/data` validates the marquee list and derives in-range portrait specs.
- `pnpm assets` generates the portrait manifest deterministically.
- `pnpm verify` green.
