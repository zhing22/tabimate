// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { countUp } from './countUp';

/** A frame loop driven by hand: tick() runs one frame. */
function manualFrames() {
  let tick: (() => void) | null = null;
  return {
    frames: (fn: () => void) => {
      tick = fn;
      return () => (tick = null);
    },
    tick: () => tick?.(),
    running: () => tick !== null,
  };
}

describe('countUp', () => {
  it('counts from +0 up to the total over the time, then stops', () => {
    const el = document.createElement('p');
    const loop = manualFrames();
    let t = 0;
    countUp(el, 100, 400, { frames: loop.frames, now: () => t, reducedMotion: false });
    expect(el.textContent).toBe('+0');
    t = 200;
    loop.tick();
    const middle = Number(el.textContent.slice(1));
    expect(middle).toBeGreaterThan(50); // eased: fast at first
    expect(middle).toBeLessThan(100);
    t = 400;
    loop.tick();
    expect(el.textContent).toBe('+100');
    expect(loop.running()).toBe(false);
  });

  it('shows the total at once with reduced motion, no time, or nothing to count', () => {
    for (const [to, ms, reducedMotion] of [
      [85, 400, true],
      [85, 0, false],
      [0, 400, false],
    ] as const) {
      const el = document.createElement('p');
      const loop = manualFrames();
      countUp(el, to, ms, { frames: loop.frames, now: () => 0, reducedMotion });
      expect(el.textContent).toBe(`+${to}`);
      expect(loop.running()).toBe(false);
    }
  });

  it('can be stopped part-way', () => {
    const el = document.createElement('p');
    const loop = manualFrames();
    const stop = countUp(el, 50, 400, { frames: loop.frames, now: () => 0, reducedMotion: false });
    stop();
    expect(loop.running()).toBe(false);
  });
});
