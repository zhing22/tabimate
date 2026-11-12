import type { KAPLAYCtx } from 'kaplay';
import { PLAYER_SIZE, SIZE_PX } from '@/config/render';
import type { Animal } from '@/core/types';
import { hardenAlpha, makeCanvas, outline } from './canvasArt';
import { paintPlayer } from './playerArt';
import type { SpriteProvider, SpriteRef } from './spriteProvider';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const SHINY_OUTLINE = '#fbf236';
// 1 px each side for the shiny outline, so both versions are the same size.
const PAD = 1;

/** The animal's emoji drawn at its size class in native px, with hard pixel edges. */
function emojiCanvas(animal: Animal, shiny: boolean): HTMLCanvasElement {
  const px = SIZE_PX[animal.size];
  const size = px + PAD * 2;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.font = `${px}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(animal.emoji, size / 2, size / 2 + 1);
  hardenAlpha(ctx, size, size);
  return shiny ? outline(canvas, SHINY_OUTLINE) : canvas;
}

const nameFor = (animal: Animal, shiny: boolean) => `emoji/${animal.id}${shiny ? '/shiny' : ''}`;

/**
 * Placeholder art: each animal is its emoji, rendered small and scaled up like
 * pixel art. Shiny (tier 5) adds a gold outline until palettes arrive (8b).
 */
export function createEmojiSpriteProvider(k: KAPLAYCtx): SpriteProvider {
  const player: SpriteRef = { name: 'player', facesLeft: false };
  // Made once per animal, so the frame loop gets the same object every time.
  const refs = new Map<Animal, readonly [plain: SpriteRef, shiny: SpriteRef]>();
  const refFor = (animal: Animal, shiny: boolean): SpriteRef => {
    let pair = refs.get(animal);
    if (!pair) {
      // Most animal emoji are drawn looking left.
      pair = [
        { name: nameFor(animal, false), facesLeft: true },
        { name: nameFor(animal, true), facesLeft: true },
      ];
      refs.set(animal, pair);
    }
    return pair[shiny ? 1 : 0];
  };

  const register = (name: string, canvas: HTMLCanvasElement) =>
    new Promise<void>((resolve, reject) => {
      k.loadSprite(name, canvas)
        .onLoad(() => resolve())
        .onError(reject);
    });

  return {
    async load(animals) {
      const jobs: Promise<void>[] = [];
      const { canvas, ctx } = makeCanvas(PLAYER_SIZE.width, PLAYER_SIZE.height);
      paintPlayer(ctx);
      jobs.push(register(player.name, canvas));
      for (const animal of animals) {
        for (const shiny of [false, true]) {
          jobs.push(register(nameFor(animal, shiny), emojiCanvas(animal, shiny)));
        }
      }
      await Promise.all(jobs);
    },
    spriteFor: refFor,
    playerSprite: () => player,
  };
}
