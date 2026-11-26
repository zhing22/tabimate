// npx tsx scripts/build-loading-kit.ts (run by npm run build, before Vite):
// the loading kit (config/loadingKit.ts), one small PNG of pre-recoloured walk
// frames (the traveller, then each LOADING_KIT.animals) and a JSON of its
// layout, from the same sheets and palettes the game uses. The Vite plugin
// (scripts/vite/loadingKit.ts) inlines it into index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { format } from 'prettier';
import sharp from 'sharp';
import { LOADING_KIT, type LoadingKitLayout } from '../src/config/loadingKit.ts';
import { TEMPLATE_KEYS, type AnimalArt, type Palette } from '../src/config/render.ts';
import { spritePalette } from '../src/scene/sprites/paletteUtils.ts';
import { PLAYER_COLOURS, PLAYER_WALK_FRAMES } from '../src/scene/sprites/playerArt.ts';
import { recolor, type Pixels } from '../src/scene/sprites/recolor.ts';
import { parseAsepriteSheet } from '../src/scene/sprites/sheet.ts';
import { BUNDLE_BUDGET } from '../src/config/performance.ts';
import { kitProblem } from './lib/bundleBudget.ts';
import { composeKit, sheetRow, textRow, type KitRow } from './lib/loadingKit.ts';

interface AnimalEntry extends AnimalArt {
  readonly id: string;
  readonly archetype: string;
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

async function readPixels(path: string): Promise<Pixels> {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) };
}

/** An animal's walk in its own colours, laid out as its sheet has it. */
async function animalRow(
  animal: AnimalEntry,
  palettes: ReadonlyMap<string, Palette>,
): Promise<KitRow> {
  const base = `public/assets/sprites/${animal.archetype}`;
  const pixels = await readPixels(`${base}.png`);
  const info = parseAsepriteSheet(readJson(`${base}.json`), pixels);
  const palette = spritePalette(animal, false, palettes, false);
  if (!palette) throw new Error(`${animal.id} has no palette`);
  return sheetRow(recolor(pixels, TEMPLATE_KEYS, palette).pixels, info, 'walk', LOADING_KIT.frames);
}

async function main() {
  const animals = readJson('public/data/animals.json') as AnimalEntry[];
  const palettes = new Map(
    Object.entries(readJson('public/data/palettes.json') as Record<string, Palette>),
  );
  const rows: KitRow[] = [textRow(PLAYER_WALK_FRAMES, PLAYER_COLOURS)];
  for (const id of LOADING_KIT.animals) {
    const animal = animals.find((a) => a.id === id);
    if (!animal) throw new Error(`LOADING_KIT.animals: no animal "${id}"`);
    rows.push(await animalRow(animal, palettes));
  }
  const kit = composeKit(rows, LOADING_KIT.cell, LOADING_KIT.frames);
  const png = await sharp(Buffer.from(kit.data), {
    raw: { width: kit.width, height: kit.height, channels: 4 },
  })
    .png({ palette: true, compressionLevel: 9, effort: 10, dither: 0 })
    .toBuffer();
  const layout: LoadingKitLayout = {
    cell: LOADING_KIT.cell,
    frames: LOADING_KIT.frames,
    fps: LOADING_KIT.fps,
    rows: ['traveller', ...LOADING_KIT.animals],
  };
  writeFileSync(LOADING_KIT.png, png);
  // As Prettier writes it, so npm run lint passes on the generated file.
  writeFileSync(LOADING_KIT.json, await format(JSON.stringify(layout), { parser: 'json' }));
  console.log(`Loading kit: ${kit.width}x${kit.height}, ${png.length} bytes -> ${LOADING_KIT.png}`);
  const problem = kitProblem(png.length, BUNDLE_BUDGET.loadingKitKb);
  if (problem) throw new Error(problem);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
