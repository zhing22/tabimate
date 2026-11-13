import type { Color, DrawRectOpt, KAPLAYCtx } from 'kaplay';
import type { Range } from '@/config/effects';
import type { Particles, Twinkle } from './particles';
import type { EffectTarget } from './types';

/**
 * Pixel stars and dots in a fixed set of colours, drawn with one reused
 * option object (nothing allocated per frame). Positions are relative to the
 * target and rounded to whole pixels.
 */
export function createPainter(k: KAPLAYCtx, target: EffectTarget, hexes: readonly string[]) {
  const colours: Color[] = hexes.map((hex) => k.rgb(hex));
  const pos = k.vec2(0, 0);
  const rect: DrawRectOpt = { width: 1, height: 1, pos, opacity: 1, color: colours[0]! };

  const fill = (x: number, y: number, w: number, h: number, opacity: number, colour: number) => {
    pos.x = Math.round(target.x + x);
    pos.y = Math.round(target.y + y);
    rect.width = w;
    rect.height = h;
    rect.opacity = opacity;
    rect.color = colours[colour] ?? colours[0]!;
    k.drawRect(rect);
  };
  // Made once and passed to every forEach: a new arrow per frame would allocate.
  const dot = (x: number, y: number, alpha: number, colour: number) =>
    fill(x, y, 1, 1, alpha, colour);

  return {
    /** A plus-shaped star: a centre pixel with arms `arm` long. */
    star(x: number, y: number, arm: number, opacity: number, colour = 0) {
      fill(x, y, 1, 1, opacity, colour);
      if (arm < 1) return;
      fill(x - arm, y, arm, 1, opacity * 0.8, colour);
      fill(x + 1, y, arm, 1, opacity * 0.8, colour);
      fill(x, y - arm, 1, arm, opacity * 0.8, colour);
      fill(x, y + 1, 1, arm, opacity * 0.8, colour);
    },
    particles(p: Particles) {
      p.forEach(dot);
    },
    /**
     * A twinkle: grows and shrinks, or with reduced motion only fades (a star
     * that changes size is motion; one that brightens is not).
     */
    twinkle(t: Twinkle, maxArm: number, reducedMotion: boolean, colour = 0) {
      if (!t.active) return;
      const s = t.strength;
      if (reducedMotion) this.star(t.x, t.y, 1, s, colour);
      else this.star(t.x, t.y, Math.round(s * maxArm), 1, colour);
    },
  };
}

/** Calls back every [min, max] seconds (random each time), as time is fed in. */
export function every([minS, maxS]: Range, random: () => number) {
  const gap = () => minS + random() * (maxS - minS);
  let left = gap();
  return (dtS: number): boolean => {
    left -= dtS;
    if (left > 0) return false;
    left = gap();
    return true;
  };
}

/** A value picked at random from [min, max]. */
export const pick = ([min, max]: Range, random: () => number): number =>
  min + random() * (max - min);

/** A random point on the upper part of a sprite, relative to its feet. */
export const pointOn = (target: EffectTarget, random: () => number) => ({
  x: Math.round((random() - 0.5) * target.size * 0.8),
  y: -Math.round(target.size * (0.35 + random() * 0.55)),
});
