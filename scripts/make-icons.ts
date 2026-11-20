// Draws the app icons (a pixel paw print on journal paper) into public/icons/:
// icon.svg (also the favicon), icon-192.png, icon-512.png, maskable-512.png
// and apple-touch-icon.png. Run: npx tsx scripts/make-icons.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const OUT = 'public/icons';
const PAPER = '#f6e8c8';
const INK = '#2b2134';
const PAW = '#c0404e';

// 16 x 16: four toes over a pad. '#' is paw.
const PAW_PIXELS = [
  '................',
  '...##......##...',
  '..####....####..',
  '..####....####..',
  '...##......##...',
  '##............##',
  '###...####...###',
  '###..######..###',
  '.#..########..#.',
  '...##########...',
  '..############..',
  '..############..',
  '..############..',
  '...##########...',
  '....###..###....',
  '................',
];

function pawRects(x0: number, y0: number, cell: number): string {
  return PAW_PIXELS.flatMap((row, y) =>
    [...row].map((c, x) =>
      c === '#'
        ? `<rect x="${x0 + x * cell}" y="${y0 + y * cell}" width="${cell}" height="${cell}" fill="${PAW}"/>`
        : '',
    ),
  ).join('');
}

/** `inset` of 0 fills the square (maskable); otherwise a framed card. */
function iconSvg(size: number, maskable: boolean): string {
  const pawCell = Math.floor((size * (maskable ? 0.5 : 0.62)) / 16);
  const pawSize = pawCell * 16;
  const offset = Math.round((size - pawSize) / 2);
  const frame = maskable
    ? `<rect width="${size}" height="${size}" fill="${PAPER}"/>`
    : `<rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${INK}"/>` +
      `<rect x="${size * 0.06}" y="${size * 0.06}" width="${size * 0.88}" height="${size * 0.88}" rx="${size * 0.13}" fill="${PAPER}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${frame}${pawRects(offset, offset, pawCell)}</svg>`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/icon.svg`, iconSvg(64, false));
const png = (svg: string, file: string) => sharp(Buffer.from(svg)).png().toFile(`${OUT}/${file}`);
await png(iconSvg(192, false), 'icon-192.png');
await png(iconSvg(512, false), 'icon-512.png');
await png(iconSvg(512, true), 'maskable-512.png');
await png(iconSvg(180, true), 'apple-touch-icon.png');
console.log(`Icons written to ${OUT}/`);
