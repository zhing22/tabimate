import { createParticles, createTwinkle } from './particles';
import { createPainter, every, pointOn } from './paint';
import type { Effect } from './types';

const COLOURS = ['#fbf236', '#ffffff', '#feae34'];
const BURST = 28;
const GRAVITY = 55;
const SHAKE_PX = 2;
const SHAKE_MS = 260;
/** The halo's resting strength and how far it pulses either side of it. */
const GLOW = 0.5;
const GLOW_PULSE = 0.15;

/**
 * Tier 5, the rarest find: its sprite already uses the shiny palette (the
 * palette shift); this adds a pulsing golden glow, a big burst of gold sparks
 * and a short screen shake as it joins, then a steady trickle of sparkles.
 * With reduced motion: a steady glow that fades up, twinkles, no shake or sparks.
 */
export const shiny: Effect = (k, target, opts) => {
  const paint = createPainter(k, target, COLOURS);
  const sparks = createParticles(48, GRAVITY);
  const twinkle = createTwinkle(0.5);
  const nextIdle = every(0.8, 1.6, opts.random);
  let time = 0;
  let entrance = opts.burst ? 1 : 0; // extra glow as it joins, fading to the resting halo

  if (opts.burst && !opts.reducedMotion) {
    opts.shake(SHAKE_PX, SHAKE_MS);
    for (let i = 0; i < BURST; i++) {
      const angle = opts.random() * Math.PI * 2;
      const speed = 30 + opts.random() * 45;
      sparks.spawn(
        0,
        -target.size / 2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 20,
        0.7 + opts.random() * 0.6,
        i % COLOURS.length,
      );
    }
  }

  const updating = k.onUpdate(() => {
    const dt = k.dt();
    time += dt;
    entrance = Math.max(0, entrance - dt * 0.8);
    sparks.update(dt);
    twinkle.update(dt);
    const pulse = opts.reducedMotion ? 0 : Math.sin(time * 3) * GLOW_PULSE;
    target.glow = Math.min(1, GLOW + pulse + entrance * (1 - GLOW));
    if (!nextIdle(dt)) return;
    const p = pointOn(target, opts.random);
    if (opts.reducedMotion) twinkle.start(p.x, p.y);
    else sparks.spawn(p.x, p.y, (opts.random() - 0.5) * 8, -14, 0.9, opts.random() < 0.6 ? 0 : 1);
  });
  const removeDraw = opts.draw(() => {
    paint.particles(sparks);
    paint.twinkle(twinkle, 1, true);
  });
  return () => {
    updating.cancel();
    removeDraw();
    target.glow = 0;
  };
};
