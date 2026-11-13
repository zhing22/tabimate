import { EFFECT_SETTINGS } from '@/config/effects';
import { createTwinkle } from './particles';
import { createPainter, every, pointOn } from './paint';
import type { Effect } from './types';

const S = EFFECT_SETTINGS.glint;
const WHITE = '#ffffff';

/**
 * Tiers 2-3: a quick shine. On joining, a star flashes at the top corner;
 * afterwards a small twinkle now and then, so the follower still reads as
 * "a good find" while walking.
 */
export const glint: Effect = (k, target, opts) => {
  const paint = createPainter(k, target, [WHITE]);
  const flash = createTwinkle(S.flashS);
  const idle = createTwinkle(S.twinkleS);
  const nextIdle = every(S.idleEveryS, opts.random);
  if (opts.burst) flash.start(Math.round(target.size * 0.3), -target.size + 2);

  const updating = k.onUpdate(() => {
    const dt = k.dt();
    flash.update(dt);
    idle.update(dt);
    if (nextIdle(dt)) {
      const p = pointOn(target, opts.random);
      idle.start(p.x, p.y);
    }
  });
  const removeDraw = opts.draw(() => {
    paint.twinkle(flash, S.flashArm, opts.reducedMotion);
    paint.twinkle(idle, 1, opts.reducedMotion);
  });
  return () => {
    updating.cancel();
    removeDraw();
  };
};
