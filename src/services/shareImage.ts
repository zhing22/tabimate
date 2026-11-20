// The share image: a 1080 x 1350 PNG of the day's journey, drawn on an
// offscreen canvas. Names and prompts never appear, as in the share text.
import { SHARE_IMAGE } from '@/config/ui';
import type { BackdropImage, PortraitImage } from '@/core/portrait';
import { shareImageLayout, type ShareImageLayout } from './shareImageLayout';

export interface ShareImageMember {
  /** The sprite still, or null to draw the emoji. */
  readonly picture: PortraitImage | null;
  readonly emoji: string;
  /** The level's short name in its colours, or null for a miss. */
  readonly badge: { readonly text: string; readonly colour: string; readonly ink: string } | null;
}

export interface ShareImageInput {
  readonly title: string;
  /** The date, "20 Nov 2026" (the theme is in the title). */
  readonly subtitle: string;
  readonly score: number;
  readonly biome: string;
  readonly sky: readonly [string, string];
  readonly ground: string;
  readonly ink: string;
  readonly backdrop: BackdropImage | null;
  readonly members: readonly ShareImageMember[];
  readonly footer: string;
}

export type ImageLoader = (src: string) => Promise<CanvasImageSource>;

const FONT = '"Pixelify Sans", system-ui, sans-serif';

function drawText(ctx: CanvasRenderingContext2D, text: string, y: number, px: number, w: number) {
  ctx.font = `700 ${px}px ${FONT}`;
  ctx.fillText(text, w / 2, y, w - 2 * SHARE_IMAGE.textMargin);
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  input: ShareImageInput,
  at: ShareImageLayout,
) {
  const sky = ctx.createLinearGradient(0, 0, 0, at.scene.y + at.scene.h);
  sky.addColorStop(0, input.sky[0]);
  sky.addColorStop(1, input.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, at.width, at.height);
  ctx.fillStyle = input.ground;
  ctx.fillRect(0, at.groundY, at.width, at.height - at.groundY);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  badge: NonNullable<ShareImageMember['badge']>,
  x: number,
  y: number,
) {
  const box = SHARE_IMAGE.badge;
  ctx.fillStyle = badge.colour;
  ctx.fillRect(x - box.width / 2, y, box.width, box.height);
  ctx.fillStyle = badge.ink;
  ctx.font = `700 ${box.px}px ${FONT}`;
  ctx.fillText(badge.text, x, y + box.baseline);
}

async function drawMember(
  ctx: CanvasRenderingContext2D,
  member: ShareImageMember,
  x: number,
  at: ShareImageLayout,
  load: ImageLoader,
) {
  const { spriteScale, emojiPx } = SHARE_IMAGE;
  if (member.picture) {
    const { width, height, src, facesLeft } = member.picture;
    const w = width * spriteScale;
    const h = height * spriteScale;
    const img = await load(src);
    // Everyone faces the way they walk (right), as in the UI's pictures.
    ctx.save();
    ctx.translate(Math.round(x), 0);
    if (facesLeft) ctx.scale(-1, 1);
    ctx.drawImage(img, Math.round(-w / 2), at.groundY - h, w, h);
    ctx.restore();
  } else {
    ctx.font = `${emojiPx}px ${FONT}`;
    ctx.fillText(member.emoji, x, at.groundY - 8);
  }
  if (member.badge) drawBadge(ctx, member.badge, x, at.badgeY);
}

/** Draws the whole image; `load` turns a picture's src into something drawable. */
export async function drawShareImage(
  ctx: CanvasRenderingContext2D,
  input: ShareImageInput,
  load: ImageLoader,
): Promise<void> {
  const at = shareImageLayout(input.members.length);
  ctx.imageSmoothingEnabled = false; // pixel art, scaled by whole numbers
  ctx.textAlign = 'center';
  drawBackground(ctx, input, at);
  if (input.backdrop) {
    ctx.drawImage(await load(input.backdrop.src), at.scene.x, at.scene.y, at.scene.w, at.scene.h);
  }
  for (const [i, member] of input.members.entries()) {
    await drawMember(ctx, member, at.slots[i]!, at, load);
  }
  const { text } = SHARE_IMAGE;
  ctx.fillStyle = input.ink;
  drawText(ctx, input.title, at.text.title, text.title.px, at.width);
  drawText(ctx, input.subtitle, at.text.subtitle, text.subtitle.px, at.width);
  drawText(ctx, `${input.score} points`, at.text.score, text.score.px, at.width);
  drawText(ctx, input.biome, at.text.biome, text.biome.px, at.width);
  drawText(ctx, input.footer, at.text.footer, text.footer.px, at.width);
}

const loadImage: ImageLoader = async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
};

/** The image as a PNG, or null where canvas drawing isn't available. */
export async function renderShareImage(input: ShareImageInput): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_IMAGE.width;
  canvas.height = SHARE_IMAGE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    await document.fonts.load(`700 ${SHARE_IMAGE.badge.px}px ${FONT}`);
  } catch {
    // The fallback font will do.
  }
  await drawShareImage(ctx, input, loadImage);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** The image's file name, shared or saved alike: "tabimate-31.png". */
export const shareImageName = (puzzleNumber: number): string => `tabimate-${puzzleNumber}.png`;

/** The image as a PNG file, named for the puzzle. */
export const shareImageFile = (blob: Blob, puzzleNumber: number): File =>
  new File([blob], shareImageName(puzzleNumber), { type: 'image/png' });

/** Saves a file the old way: a temporary download link, clicked. */
export function downloadImage(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
