// Dev only: draws a recoloured sheet at x4 on each biome's colours, walking
// and standing (with the game's idle motion), for the palette editor.
import { BIOMES } from '@/config/biomes';
import { TEMPLATE_KEYS, type Palette } from '@/config/render';
import { createIdleMotion, type Pose } from '@/scene/entities/idleMotion';
import { makeCanvas } from '@/scene/sprites/canvasArt';
import { blinkPalette } from '@/scene/sprites/paletteUtils';
import type { LoadedSheet } from '@/scene/sprites/pixelSpriteProvider';
import { recolor, type Pixels } from '@/scene/sprites/recolor';
import { frameAt } from '@/scene/sprites/sheet';

const ZOOM = 4;
const PAD = 8; // native px around the two sprites

function toCanvas({ width, height, data }: Pixels): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.putImageData(new ImageData(new Uint8ClampedArray(data), width, height), 0, 0);
  return canvas;
}

export interface Preview {
  /** Recolours the sheet (once per change, not per frame). Returns stray colours. */
  setPalette(palette: Palette): readonly string[];
  destroy(): void;
}

/** One canvas per biome, side by side in `root`, animated until destroy(). */
export function createPreview(root: HTMLElement, sheet: LoadedSheet): Preview {
  const { frameWidth: fw, frameHeight: fh, frames, tags } = sheet.info;
  const width = (fw * 2 + PAD * 3) * ZOOM;
  const height = (fh + PAD * 2) * ZOOM;
  const views = BIOMES.map((biome) => {
    const { canvas, ctx } = makeCanvas(width, height);
    canvas.className = 'preview__canvas';
    canvas.title = biome.name;
    const label = document.createElement('figcaption');
    label.textContent = biome.name;
    const figure = document.createElement('figure');
    figure.append(canvas, label);
    root.append(figure);
    return { biome, ctx };
  });

  let open: HTMLCanvasElement | null = null;
  let shut: HTMLCanvasElement | null = null;
  let blinking = 0;
  const idle = createIdleMotion({
    seed: 'preview',
    reducedMotion: false,
    onBlink: () => (blinking = 0.14),
  });
  const pose: Pose = { dy: 0, scaleY: 1, angle: 0 };

  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    image: HTMLCanvasElement,
    index: number,
    x: number,
    p: Pose,
  ) => {
    const f = frames[index]!;
    const bottom = (PAD + fh) * ZOOM;
    ctx.save();
    ctx.translate((x + fw / 2) * ZOOM, bottom + p.dy * ZOOM);
    ctx.rotate(p.angle);
    ctx.scale(1, p.scaleY);
    ctx.drawImage(image, f.x, f.y, f.w, f.h, (-fw / 2) * ZOOM, -fh * ZOOM, fw * ZOOM, fh * ZOOM);
    ctx.restore();
  };

  let last = performance.now();
  let time = 0;
  let raf = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    time += dt;
    idle.update(dt, pose);
    blinking = Math.max(0, blinking - dt);
    for (const { biome, ctx } of views) {
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, biome.palette.skyTop);
      sky.addColorStop(1, biome.palette.skyBottom);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = biome.palette.ground;
      ctx.fillRect(0, (PAD + fh - 1) * ZOOM, width, height);
      if (!open || !shut) continue;
      const walk = tags.walk ? frameAt(tags.walk, time) : 0;
      drawFrame(ctx, open, walk, PAD, { dy: 0, scaleY: 1, angle: 0 });
      drawFrame(ctx, blinking > 0 ? shut : open, 0, PAD * 2 + fw, pose);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    setPalette(palette) {
      const result = recolor(sheet.pixels, TEMPLATE_KEYS, palette);
      open = toCanvas(result.pixels);
      shut = toCanvas(recolor(sheet.pixels, TEMPLATE_KEYS, blinkPalette(palette)).pixels);
      return result.unknown;
    },
    destroy() {
      cancelAnimationFrame(raf);
      root.replaceChildren();
    },
  };
}
