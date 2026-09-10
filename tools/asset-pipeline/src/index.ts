import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { derivePortrait, marquee } from '@pavilion/data';

const repoRoot = process.env.INIT_CWD ?? process.cwd();
const outputDir = process.argv[2] ?? join(repoRoot, 'assets/generated');
const CELL_WIDTH = 32;
const CELL_HEIGHT = 48;
const ATLAS_BUDGET = 2048;
const COLUMNS = Math.floor(ATLAS_BUDGET / CELL_WIDTH);

mkdirSync(outputDir, { recursive: true });

const portraits = marquee.map((player, index) => ({
  playerId: player.id,
  name: player.name,
  country: player.country,
  era: player.era,
  role: player.role,
  sheet: 'portraits',
  cell: {
    column: index % COLUMNS,
    row: Math.floor(index / COLUMNS),
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
  },
  ...derivePortrait(player),
}));

const manifest = {
  version: 1,
  atlas: { sheet: 'portraits', width: ATLAS_BUDGET, height: ATLAS_BUDGET },
  cell: { width: CELL_WIDTH, height: CELL_HEIGHT },
  count: portraits.length,
  portraits,
};

writeFileSync(join(outputDir, 'portraits.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Generated ${portraits.length} portrait specs -> ${join(outputDir, 'portraits.json')}`);
console.log(
  `Atlas budget ${ATLAS_BUDGET}px, cells ${CELL_WIDTH}x${CELL_HEIGHT}, integer scaling, ${COLUMNS} columns.`,
);
console.log(
  'Next: run the AI reference-locked portrait pass, pixel post-process, then pack the atlas.',
);
