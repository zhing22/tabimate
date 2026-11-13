// Turns a folder of (AI-generated) images into rough pixel art for cleanup in
// Aseprite: nearest-neighbour downscale, quantise to N colours (optionally only
// colours from master-palette.json), background made transparent.
//
//   npm run pixelate -- <input folder> --size 24 [--height 24] [--colors 6] [--master]
//
// Writes PNGs to art/pixelated/ and prints the colours each one uses.
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import * as iq from 'image-q';
import sharp from 'sharp';

const OUT_DIR = 'art/pixelated';
const IMAGE = /\.(png|jpe?g|webp|gif|tiff?|avif)$/i;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    size: { type: 'string', default: '24' },
    height: { type: 'string' },
    colors: { type: 'string', default: '6' },
    master: { type: 'boolean', default: false },
  },
});
const input = positionals[0];
const width = Number(values.size);
const height = Number(values.height ?? values.size);
const colours = Number(values.colors);
if (!input || !(width > 0 && height > 0 && colours >= 2)) {
  console.error(
    'Usage: npm run pixelate -- <input folder> --size 24 [--height 24] [--colors 6] [--master]',
  );
  process.exit(1);
}

const hex = (p: iq.utils.Point) =>
  `#${[p.r, p.g, p.b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
const pointOf = (h: string) =>
  iq.utils.Point.createByRGBA(
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
    255,
  );

const master = values.master
  ? (JSON.parse(readFileSync('public/data/master-palette.json', 'utf8')) as string[]).map(pointOf)
  : null;

/** The N-colour palette for an image, moved onto the master palette if asked. */
function paletteFor(image: iq.utils.PointContainer): iq.utils.Palette {
  const built = iq.buildPaletteSync([image], { colors: colours, paletteQuantization: 'wuquant' });
  if (!master) return built;
  const distance = new iq.distance.EuclideanBT709();
  const snapped = new iq.utils.Palette();
  const seen = new Set<string>();
  for (const p of built.getPointContainer().getPointArray()) {
    const nearest = master.reduce((a, b) =>
      distance.calculateNormalized(p, a) <= distance.calculateNormalized(p, b) ? a : b,
    );
    if (!seen.has(hex(nearest))) {
      seen.add(hex(nearest));
      snapped.add(nearest);
    }
  }
  return snapped;
}

async function pixelate(file: string) {
  const { data } = await sharp(file)
    .ensureAlpha()
    .resize(width, height, {
      kernel: 'nearest',
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Mostly-transparent pixels become fully clear before counting colours.
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 128) data.set([0, 0, 0, 0], i - 3);

  const image = iq.utils.PointContainer.fromUint8Array(new Uint8Array(data), width, height);
  const out = iq
    .applyPaletteSync(image, paletteFor(image), { imageQuantization: 'nearest' })
    .toUint8Array();

  // The background is the colour most of the corners share; make it transparent.
  const key = (i: number) => (out[i + 3] === 0 ? 'clear' : `${out[i]},${out[i + 1]},${out[i + 2]}`);
  const corners = [0, width - 1, (height - 1) * width, height * width - 1].map((p) => key(p * 4));
  const background = corners.sort(
    (a, b) => corners.filter((c) => c === b).length - corners.filter((c) => c === a).length,
  )[0];
  const used = new Set<string>();
  for (let i = 0; i < out.length; i += 4) {
    if (key(i) === background) out.set([0, 0, 0, 0], i);
    else if (out[i + 3] !== 0)
      used.add(hex(iq.utils.Point.createByRGBA(out[i]!, out[i + 1]!, out[i + 2]!, 255)));
  }

  const target = join(OUT_DIR, `${basename(file, extname(file))}.png`);
  await sharp(Buffer.from(out), { raw: { width, height, channels: 4 } })
    .png()
    .toFile(target);
  console.log(`${target}  ${used.size} colours: ${[...used].join(' ')}`);
}

mkdirSync(OUT_DIR, { recursive: true });
const files = readdirSync(input).filter((name) => IMAGE.test(name));
if (files.length === 0) console.error(`No images found in ${input}`);
for (const name of files) await pixelate(join(input, name));
