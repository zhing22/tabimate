import { animationFrames, type FrameLoop } from '../frames';
import { prefersReducedMotion } from '../motion';

export interface CountUpOptions {
  /** Injected for tests. */
  readonly frames?: FrameLoop;
  readonly now?: () => number;
  readonly reducedMotion?: boolean;
}

/** Fast at first, settling on the total: the numbers spin up, then land. */
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Counts `el`'s text up from "+0" to "+to" over `ms`. With no time, or with
 * reduced motion, it shows the total at once. Returns a stop function.
 */
export function countUp(el: HTMLElement, to: number, ms: number, options: CountUpOptions = {}) {
  const reduced = options.reducedMotion ?? prefersReducedMotion();
  if (ms <= 0 || to <= 0 || reduced) {
    el.textContent = `+${to}`;
    return () => {};
  }
  const now = options.now ?? (() => performance.now());
  const start = now();
  el.textContent = '+0';
  const stop = (options.frames ?? animationFrames)(() => {
    const t = Math.min(1, (now() - start) / ms);
    el.textContent = `+${Math.round(to * easeOut(t))}`;
    if (t >= 1) stop();
  });
  return stop;
}
