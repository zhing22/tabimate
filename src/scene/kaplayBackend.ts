import type { DrawRectOpt, DrawSpriteOpt, KAPLAYCtx } from 'kaplay';
import { NATIVE_HEIGHT } from '@/config/render';
import type { SceneryBackend } from './drawScenery';

/**
 * Scenery drawn with Kaplay, for the live scene. One options object per kind of
 * draw and two sky colours, all reused: a frame allocates nothing of ours.
 */
export function kaplaySceneryBackend(k: KAPLAYCtx): SceneryBackend {
  const pos = k.vec2(0, 0);
  const sprite: DrawSpriteOpt = { sprite: '', pos, anchor: 'topleft', frame: 0, opacity: 1 };
  const top = k.rgb(0, 0, 0);
  const bottom = k.rgb(0, 0, 0);
  const sky: DrawRectOpt = {
    width: 0,
    height: NATIVE_HEIGHT,
    pos: k.vec2(0, 0),
    gradient: [top, bottom],
  };
  return {
    image(piece, x, y, opacity) {
      sprite.sprite = piece.sprite;
      pos.x = x;
      pos.y = y;
      sprite.opacity = opacity;
      k.drawSprite(sprite);
    },
    sky(from, to, width) {
      top.r = from.r;
      top.g = from.g;
      top.b = from.b;
      bottom.r = to.r;
      bottom.g = to.g;
      bottom.b = to.b;
      sky.width = width;
      k.drawRect(sky);
    },
  };
}
