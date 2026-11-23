// An archetype's placeholder sheet: its frames for each tag its animals need,
// as RGBA pixels in the template key colours and Aseprite-format JSON. Pure;
// scripts/drawPlaceholderSheets.ts writes the files.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { TEMPLATE_KEYS } from '../../../src/config/render.ts';
import type { Movement } from '../../../src/core/types.ts';
import { createGrid, outline, shade, SLOT, type Grid, type Pose } from './grid.ts';
import { drawPlan, shadesItself, type PlanSpec } from './plans.ts';

export type Tag = Pose['mode'];

/** Every sheet walks; sky animals also flap and water animals also swim. */
export function tagsFor(movements: Iterable<Movement>): Tag[] {
  const set = new Set(movements);
  return [
    'walk' as const,
    ...(set.has('sky') ? (['flap'] as const) : []),
    ...(set.has('water') ? (['swim'] as const) : []),
  ];
}

/** Each tag's frames in order, shaded and outlined. */
export function drawFrames(spec: PlanSpec, tags: readonly Tag[]): Grid[] {
  return tags.flatMap((mode) =>
    Array.from({ length: PLACEHOLDER_ART.framesPerTag }, (_, phase) => {
      const g = createGrid();
      drawPlan(g, { mode, phase }, spec);
      if (!shadesItself(spec)) shade(g);
      outline(g);
      return g;
    }),
  );
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Frames side by side, one row, as RGBA bytes. */
export function sheetPixels(frames: readonly Grid[]) {
  const size = PLACEHOLDER_ART.size;
  const width = size * frames.length;
  const data = new Uint8Array(width * size * 4);
  frames.forEach((g, f) =>
    g.cells.forEach((row, y) =>
      row.forEach((k, x) => {
        if (k === '.') return;
        const [r, gr, b] = rgb(TEMPLATE_KEYS[SLOT[k]]!);
        data.set([r!, gr!, b!, 255], (y * width + f * size + x) * 4);
      }),
    ),
  );
  return { width, height: size, data };
}

/** The sheet's JSON, as Aseprite's "Export Sprite Sheet" (hash) writes it. */
export function sheetJson(archetype: string, tags: readonly Tag[]) {
  const { size, framesPerTag: n, frameMs, app } = PLACEHOLDER_ART;
  const count = tags.length * n;
  const frames = Object.fromEntries(
    Array.from({ length: count }, (_, f) => [
      `${archetype} ${f}.aseprite`,
      { frame: { x: f * size, y: 0, w: size, h: size }, duration: frameMs },
    ]),
  );
  const frameTags = tags.map((name, i) => ({
    name,
    from: i * n,
    to: i * n + n - 1,
    direction: 'forward',
  }));
  const meta = {
    app,
    image: `${archetype}.png`,
    format: 'RGBA8888',
    size: { w: count * size, h: size },
    frameTags,
  };
  return { frames, meta };
}

/** A sheet this script made (so it may redraw it); anything else is real art. */
export const isPlaceholder = (json: unknown): boolean =>
  typeof json === 'object' &&
  json !== null &&
  (json as { meta?: { app?: unknown } }).meta?.app === PLACEHOLDER_ART.app;
