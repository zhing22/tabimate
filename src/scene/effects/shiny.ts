import { EFFECT_SETTINGS } from '@/config/effects';
import { createParticles, createTwinkle } from './particles';
import { createPainter, every, pick, pointOn } from './paint';
import type { Effect } from './types';

const S = EFFECT_SETTINGS.shiny;

/**
 * Tier 5, the rarest find: its sprite already uses the shiny palette (the
 * palette shift); this adds a pulsing golden glow, a big burst of gold sparks
 * and a short screen shake as it joins, then a steady trickle of sparkles.
 * With reduced motion: a steady glow that fades up, twinkles, no shake or sparks.
 */
export const shiny: Effect = (k, target, opts) => {
  const paint = createPainter(k, target, S.colours);
  const sparks = createParticles(S.pool, S.gravity);
  const twinkle = createTwinkle(S.twinkleS);
  const nextIdle = every(S.idleEveryS, opts.random);
  let time = 0;
  let entrance = opts.burst ? 1 : 0; // extra glow as it joins, fading to the resting halo

  if (opts.burst && !opts.reducedMotion) {
    opts.shake(S.shakePx, S.shakeMs);
    for (let i = 0; i < S.burst; i++) {
      const angle = opts.random() * Math.PI * 2;
      const speed = pick(S.burstSpeed, opts.random);
      const life = pick(S.burstLifeS, opts.random);
      const dy = Math.sin(angle) * speed - S.burstLift;
      sparks.spawn(0, -target.size / 2, Math.cos(angle) * speed, dy, life, i % S.colours.length);
    }
  }

  const updating = k.onUpdate(() => {
    const dt = k.dt();
    time += dt;
    entrance = Math.max(0, entrance - dt * S.entranceFadePerS);
    sparks.update(dt);
    twinkle.update(dt);
    const pulse = opts.reducedMotion ? 0 : Math.sin(time * S.glowPulsePerS) * S.glowPulse;
    target.glow = Math.min(1, S.glow + pulse + entrance * (1 - S.glow));
    if (!nextIdle(dt)) return;
    const p = pointOn(target, opts.random);
    if (opts.reducedMotion) {
      twinkle.start(p.x, p.y);
      return;
    }
    const dx = (opts.random() - 0.5) * S.driftSpeed * 0.5;
    sparks.spawn(p.x, p.y, dx, -S.driftSpeed, S.driftLifeS, opts.random() < 0.6 ? 0 : 1);
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
