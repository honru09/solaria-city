/**
 * Solaria City — Sunstate Underworld
 * Make.fun competition gta6-01 entrypoint.
 *
 * 3D open-world crime action game set across the districts of Solaria City.
 * Built using Three.js (r128) with vehicle driving mechanics, civilian traffic,
 * pedestrian artificial intelligence, 5-star police response system, on-foot
 * combat, structured story missions, minimap HUD, and procedural synthwave audio.
 *
 * This runner stages game distribution assets and generates the competition
 * dossier metadata required by the automated grader.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
const screenshotsDir = join(here, 'screenshots');

// Verify essential source assets exist before assembling the distribution bundle
if (!existsSync(gameDir)) {
  throw new Error(`Source game directory does not exist: ${gameDir}`);
}

const htmlEntry = join(gameDir, 'index.html');
if (!existsSync(htmlEntry)) {
  throw new Error(`Game entry file does not exist: ${htmlEntry}`);
}

if (!existsSync(screenshotsDir)) {
  throw new Error(`Screenshots directory does not exist: ${screenshotsDir}`);
}

// Prepare destination structure and mirror assets
mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(screenshotsDir, join(out, 'screenshots'), { recursive: true });

// Generate dossier summary conforming to grader limits and caps
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
