import { fnv1a } from '@/core/matcher/similarity';

/** A source of numbers in [0, 1) that repeats exactly for the same seed. */
export type Random = () => number;

/**
 * Seeded generator (mulberry32). The scene uses it wherever "random" must be
 * the same for everyone, e.g. where props stand on the day's walk.
 */
export function seededRandom(seed: string): Random {
  let a = fnv1a(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
