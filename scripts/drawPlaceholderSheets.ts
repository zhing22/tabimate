// Code-drawn placeholder sheets for every archetype in animals.json
// (scripts/lib/placeholder/), in the template key colours and Aseprite's
// export format, plus a palette from its tint for every animal without one.
// Real art wins: a sheet whose meta.app isn't this script's is never touched,
// so exporting an Aseprite sheet of the same name replaces a placeholder.
// A placeholder no archetype uses any more (one split into looks) is removed.
//
//   npm run art:placeholders [-- --dry-run]
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import type { HexColour } from '../src/config/colour.ts';
import { representativeFor } from '../src/core/hierarchy.ts';
import type { Movement } from '../src/core/types.ts';
import { validateAnimals } from '../src/data/validate.ts';
import { readJson, writeJson } from './lib/jsonFile.ts';
import { ARCHETYPES } from './lib/placeholder/archetypes.ts';
import { addDerivedPalettes, type RawAnimal } from './lib/placeholder/derivePalettes.ts';
import {
  drawFrames,
  isPlaceholder,
  sheetJson,
  sheetPixels,
  tagsFor,
} from './lib/placeholder/sheet.ts';

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean', default: false } } });
const dry = values['dry-run'];
const SPRITES = 'public/assets/sprites';
const DATA = 'public/data';

const raw = readJson<RawAnimal[]>(`${DATA}/animals.json`);
const animals = validateAnimals(raw, 'data/animals.json');

// Each archetype that draws someone (a group draws as its representative),
// with how those animals move; and the animals that need colours of their own.
const movements = new Map<string, Set<Movement>>();
const drawsItself = new Set<string>();
for (const animal of animals.values()) {
  const source = representativeFor(animal, animals);
  if (source === animal) drawsItself.add(animal.id);
  const set = movements.get(source.archetype) ?? new Set();
  movements.set(source.archetype, set.add(animal.movement));
}

const missing = [...movements.keys()].filter((a) => !ARCHETYPES[a]);
if (missing.length > 0) throw new Error(`No placeholder plan for: ${missing.join(', ')}`);

const manifest = new Set(readJson<string[]>(`${SPRITES}/manifest.json`));
const drawn: string[] = [];
const kept: string[] = [];
for (const [archetype, moves] of [...movements].sort(([a], [b]) => a.localeCompare(b))) {
  const json = `${SPRITES}/${archetype}.json`;
  if (existsSync(json) && !isPlaceholder(readJson<unknown>(json))) {
    kept.push(archetype);
    manifest.add(archetype);
    continue;
  }
  const tags = tagsFor(moves);
  const { width, height, data } = sheetPixels(drawFrames(ARCHETYPES[archetype]!, tags));
  if (!dry) {
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(`${SPRITES}/${archetype}.png`);
    writeFileSync(json, `${JSON.stringify(sheetJson(archetype, tags), null, 2)}\n`);
  }
  manifest.add(archetype);
  drawn.push(`${archetype} (${tags.join(', ')})`);
}

const removed: string[] = [];
for (const name of [...manifest]) {
  const json = `${SPRITES}/${name}.json`;
  if (movements.has(name) || !existsSync(json) || !isPlaceholder(readJson<unknown>(json))) continue;
  if (!dry) {
    rmSync(json);
    rmSync(`${SPRITES}/${name}.png`, { force: true });
  }
  manifest.delete(name);
  removed.push(name);
}

const palettes = readJson<Record<string, HexColour[]>>(`${DATA}/palettes.json`);
const master = readJson<HexColour[]>(`${DATA}/master-palette.json`);
const added = addDerivedPalettes(raw, palettes, master, drawsItself);

if (!dry) {
  await writeJson(`${SPRITES}/manifest.json`, [...manifest].sort());
  await writeJson(`${DATA}/palettes.json`, palettes);
  await writeJson(`${DATA}/animals.json`, raw);
}
console.log(
  `${dry ? '[dry run] ' : ''}Drew ${drawn.length} placeholder sheets:\n  ${drawn.join('\n  ')}`,
);
console.log(`Removed ${removed.length} unused placeholders: ${removed.join(', ') || 'none'}`);
console.log(`Kept ${kept.length} sheets of real art: ${kept.join(', ') || 'none'}`);
console.log(`Gave ${added.length} animals a palette from their tint.`);
