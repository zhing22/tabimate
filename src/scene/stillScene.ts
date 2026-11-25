import type { BiomeId } from '@/config/biomes';
import { MAX_VISIBLE_WIDTH, NATIVE_HEIGHT } from '@/config/render';
import { BIOME_ART } from './biomes/registry';
import { watchCanvasLayout } from './canvasLayout';
import { paintSceneArea } from './setupScenery';
import { makeCanvas } from './sprites/canvasArt';

/** One biome's sky and layers at the start of the strip, on a 2D canvas (no props, no party). */
function paintBiome(ctx: CanvasRenderingContext2D, biome: BiomeId): void {
  const art = BIOME_ART[biome];
  const sky = ctx.createLinearGradient(0, 0, 0, NATIVE_HEIGHT);
  sky.addColorStop(0, art.sky[0]);
  sky.addColorStop(1, art.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, MAX_VISIBLE_WIDTH, NATIVE_HEIGHT);
  for (const layer of art.layers) {
    const { canvas } = makeCanvas(layer.width, layer.height);
    const paint = canvas.getContext('2d');
    if (!paint) continue;
    layer.source(paint, layer.width, layer.height);
    for (let x = 0; x < MAX_VISIBLE_WIDTH; x += layer.width) ctx.drawImage(canvas, x, layer.y);
  }
}

/**
 * The first biome painted at once, while the day loads, laid out exactly as
 * the live scene will be (same viewport and stage), so the scene only gains
 * its party and props when it starts. The live canvas covers it; dispose()
 * removes it.
 */
export function showStillScene(container: HTMLElement, biome: BiomeId): { dispose(): void } {
  const { canvas, ctx } = makeCanvas(MAX_VISIBLE_WIDTH, NATIVE_HEIGHT);
  canvas.className = 'scene__canvas scene__canvas--still';
  canvas.style.imageRendering = 'pixelated';
  paintBiome(ctx, biome);
  container.append(canvas);
  paintSceneArea(container, biome, BIOME_ART[biome].sky[0]);
  const layout = watchCanvasLayout(container, canvas);
  return {
    dispose() {
      layout.dispose();
      canvas.remove();
    },
  };
}
