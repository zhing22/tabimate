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

/**
 * A state's sheet from an earlier audit above this one's, labelled, both at
 * this one's width: what changed, at a glance.
 */
export async function writeComparison(
  title: string,
  beforeFile: string,
  afterFile: string,
  file: string,
): Promise<void> {
  const { gap, labelHeight, background } = AUDIT.sheet;
  const after = await sharp(afterFile).png().toBuffer();
  const { width = 1, height: afterH = 1 } = await sharp(after).metadata();
  const before = await sharp(beforeFile).resize({ width }).png().toBuffer();
  const { height: beforeH = 1 } = await sharp(before).metadata();
  const afterTop = labelHeight + beforeH + gap + labelHeight;
  await sharp({
    create: { width, height: afterTop + afterH, channels: 3, background },
  })
    .composite([
      { input: labelSvg(`${title} · before`, width), left: 0, top: 0 },
      { input: before, left: 0, top: labelHeight },
      { input: labelSvg(`${title} · after`, width), left: 0, top: afterTop - labelHeight },
      { input: after, left: 0, top: afterTop },
    ])
    .png()
    .toFile(file);
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
