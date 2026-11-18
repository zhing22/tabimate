import { EFFECT_SETTINGS } from '@/config/effects';
import { createParticles, createTwinkle } from './particles';
import { createPainter, every, pick, pointOn } from './paint';
import type { Effect } from './types';

const S = EFFECT_SETTINGS.sparkle;

/**
 * Level 4: particles. On joining, a burst of sparks flies out of the follower
 * and falls away; afterwards one drifts up now and then. With reduced motion,
 * a soft glow fades instead of the burst, and the drift becomes a twinkle.
 */
export const sparkle: Effect = (k, target, opts) => {
  const paint = createPainter(k, target, S.colours);
  const sparks = createParticles(S.pool, S.gravity);
  const twinkle = createTwinkle(S.twinkleS);
  const nextIdle = every(S.idleEveryS, opts.random);
  let fade = 0;

  if (opts.burst && opts.reducedMotion) {
    fade = 1;
  } else if (opts.burst) {
    for (let i = 0; i < S.burst; i++) {
      const angle = Math.PI * (1.1 + opts.random() * 0.8); // mostly upwards
      const speed = pick(S.burstSpeed, opts.random);
      const life = pick(S.burstLifeS, opts.random);
      const dx = Math.cos(angle) * speed;
      sparks.spawn(0, -target.size / 2, dx, Math.sin(angle) * speed, life, i % S.colours.length);
    }
  }

  const updating = k.onUpdate(() => {
    const dt = k.dt();
    sparks.update(dt);
    twinkle.update(dt);
    fade = Math.max(0, fade - dt * S.glowFadePerS);
    target.glow = fade;
    if (!nextIdle(dt)) return;
    const p = pointOn(target, opts.random);
    if (opts.reducedMotion) {
      twinkle.start(p.x, p.y);
      return;
    }
    const dx = (opts.random() - 0.5) * S.driftSpeed * 0.5;
    sparks.spawn(p.x, p.y, dx, -S.driftSpeed, S.driftLifeS, 1 + (opts.random() < 0.5 ? 1 : 0));
  });
  const removeDraw = opts.draw(() => {
    paint.particles(sparks);
    paint.twinkle(twinkle, 1, true, 1);
  });
  return () => {
    updating.cancel();
    removeDraw();
    target.glow = 0;
  };
};
