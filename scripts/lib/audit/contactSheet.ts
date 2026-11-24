// One PNG per state: every size's screenshot side by side, labelled.
import sharp from 'sharp';
import { AUDIT } from './targets';
import { sheetLayout, type Shot } from './sheetLayout';

export interface ShotFile extends Shot {
  readonly png: Buffer;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function labelSvg(text: string, width: number): Buffer {
  const { labelHeight, labelPx } = AUDIT.sheet;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${labelHeight}">` +
      `<text x="0" y="${labelPx}" font-family="sans-serif" font-size="${labelPx}" fill="#e8e8e8">` +
      `${escapeXml(text)}</text></svg>`,
  );
}

export async function writeContactSheet(
  title: string,
  shots: readonly ShotFile[],
  file: string,
): Promise<void> {
  const { rowHeight, gap, labelHeight, background } = AUDIT.sheet;
  const layout = sheetLayout(shots, { rowHeight, gap, labelHeight });
  const layers = await Promise.all(
    layout.placed.map(async (p) => {
      const shot = shots[p.index];
      if (!shot) throw new Error('layout index out of range');
      const picture = await sharp(shot.png).resize(p.width, p.height).png().toBuffer();
      return [
        { input: labelSvg(`${title} · ${shot.label}`, p.width), left: p.left, top: p.top },
        { input: picture, left: p.left, top: p.top + labelHeight },
      ];
    }),
  );
  await sharp({
    create: { width: layout.width, height: layout.height, channels: 3, background },
  })
    .composite(layers.flat())
    .png()
    .toFile(file);
}
