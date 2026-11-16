import type { BiomeId } from '@/config/biomes';
import { BACKDROP, GROUND_Y, NATIVE_HEIGHT, PROP_BASE_Y } from '@/config/render';
import type { BackdropImage } from '@/core/portrait';
import type { BiomeArtSprites } from './biomes/load';
import { propsInSegment } from './props';
import { makeCanvas } from './sprites/canvasArt';

const BACKDROP_WIDTH = BACKDROP.width;
const CROP_TOP = BACKDROP.top;

/**
 * Paints a biome's scenery as one still (sky, layers, the day's props, ground),
 * cropped to the strip around the walk line: the results line-up stands in it.
 */
export function paintBackdrop(art: BiomeArtSprites, seed: string): BackdropImage {
  const { canvas, ctx } = makeCanvas(BACKDROP_WIDTH, NATIVE_HEIGHT);
  const sky = ctx.createLinearGradient(0, 0, 0, NATIVE_HEIGHT);
  sky.addColorStop(0, art.sky[0]);
  sky.addColorStop(1, art.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, BACKDROP_WIDTH, NATIVE_HEIGHT);
  for (const layer of art.layers) {
    for (let x = 0; x < BACKDROP_WIDTH; x += layer.width) ctx.drawImage(layer.canvas, x, layer.y);
  }
  for (const p of propsInSegment(seed, art.props, 0)) {
    const prop = art.props[p.kind]!;
    if (p.x < BACKDROP_WIDTH) ctx.drawImage(prop.canvas, p.x, PROP_BASE_Y - prop.height);
  }
  const height = NATIVE_HEIGHT - CROP_TOP;
  const { canvas: out, ctx: crop } = makeCanvas(BACKDROP_WIDTH, height);
  crop.drawImage(canvas, 0, CROP_TOP, BACKDROP_WIDTH, height, 0, 0, BACKDROP_WIDTH, height);
  return {
    src: out.toDataURL('image/png'),
    width: BACKDROP_WIDTH,
    height,
    groundY: GROUND_Y - CROP_TOP,
  };
}

/** One painted still per biome, made on first ask. */
export function createBackdrops(art: Readonly<Record<BiomeId, BiomeArtSprites>>, seed: string) {
  const made = new Map<BiomeId, BackdropImage>();
  return (id: string): BackdropImage | null => {
    const biome = art[id as BiomeId] as BiomeArtSprites | undefined;
    if (!biome) return null;
    let image = made.get(id as BiomeId);
    if (!image) {
      image = paintBackdrop(biome, `${seed}|${id}`);
      made.set(id as BiomeId, image);
    }
    return image;
  };
}
