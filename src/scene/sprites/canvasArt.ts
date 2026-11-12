// Small helpers for drawing placeholder art in code onto offscreen canvases.

export function makeCanvas(
  width: number,
  height: number,
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Makes every pixel fully opaque or fully clear. Text and emoji are drawn
 * with soft edges; scaled up by whole pixels those would look smeared.
 */
export function hardenAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 3; i < data.length; i += 4) data[i] = data[i]! >= 110 ? 255 : 0;
  ctx.putImageData(image, 0, 0);
}

/** Draws a 1 px outline in `colour` around whatever is on the canvas. */
export function outline(canvas: HTMLCanvasElement, colour: string): HTMLCanvasElement {
  const { width, height } = canvas;
  const silhouette = makeCanvas(width, height);
  silhouette.ctx.drawImage(canvas, 0, 0);
  silhouette.ctx.globalCompositeOperation = 'source-in';
  silhouette.ctx.fillStyle = colour;
  silhouette.ctx.fillRect(0, 0, width, height);
  const out = makeCanvas(width, height);
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    out.ctx.drawImage(silhouette.canvas, dx, dy);
  }
  out.ctx.drawImage(canvas, 0, 0);
  return out.canvas;
}
