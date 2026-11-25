// Ember Street Diner - the entry packaging script.
//
// make.fun hands a game in as a directory of static files plus a few renders of
// it, and wants a dossier.json next to them: a canonical JSON description of
// the game tree and the screenshots, which their scorer regenerates itself.
//
// This script copies the entry into the output directory and writes that
// dossier with the library they ship, so what we write here is byte for byte
// what their scorer expects.
//
// Run it with:  node main.ts
// It reads MAKEFUN_OUTPUT_DIR for where to write (default /output).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this file lives, so the copy source is found no matter the cwd.
const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The two directories that make up an entry: the playable game and its renders.
const gameDir = join(here, 'game');
const shotDir = join(here, 'screenshots');

mkdirSync(outDir, { recursive: true });

// The game itself, always present.
cpSync(gameDir, join(outDir, 'game'), { recursive: true });

// The renders, when we have them. The dossier refuses an entry without any.
if (existsSync(shotDir)) {
  cpSync(shotDir, join(outDir, 'screenshots'), { recursive: true });
}

// The caps the bounty's gate gives us. text_max_bytes shapes the bytes; the
// rest only refuse, so passing them along keeps us honest.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`dossier.json written: ${dossier.length} bytes -> ${outDir}`);
