import { createParticles, createTwinkle } from './particles';
import { createPainter, every, pointOn } from './paint';
import type { Effect } from './types';

const COLOURS = ['#ffffff', '#b55088', '#f6757a'];
const BURST = 14;
const GRAVITY = 70;

/**
 * Tier 4: particles. On joining, a burst of sparks flies out of the follower
 * and falls away; afterwards one drifts up now and then. With reduced motion,
 * a soft glow fades instead of the burst, and the drift becomes a twinkle.
 */
export const sparkle: Effect = (k, target, opts) => {
  const paint = createPainter(k, target, COLOURS);
  const sparks = createParticles(24, GRAVITY);
  const twinkle = createTwinkle(0.5);
  const nextIdle = every(1.5, 3, opts.random);
  let fade = 0;

  if (opts.burst && opts.reducedMotion) {
    fade = 1;
  } else if (opts.burst) {
    for (let i = 0; i < BURST; i++) {
      const angle = Math.PI * (1.1 + opts.random() * 0.8); // mostly upwards
      const speed = 25 + opts.random() * 30;
      const colour = i % COLOURS.length;
      sparks.spawn(
        0,
        -target.size / 2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.6 + opts.random() * 0.4,
        colour,
      );
    }
  }

  const updating = k.onUpdate(() => {
    const dt = k.dt();
    sparks.update(dt);
    twinkle.update(dt);
    fade = Math.max(0, fade - dt * 1.5);
    target.glow = fade;
    if (!nextIdle(dt)) return;
    const p = pointOn(target, opts.random);
    if (opts.reducedMotion) twinkle.start(p.x, p.y);
    else
      sparks.spawn(p.x, p.y, (opts.random() - 0.5) * 6, -12, 1, 1 + (opts.random() < 0.5 ? 1 : 0));
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
