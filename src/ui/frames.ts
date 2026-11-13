/** Calls `tick` once per animation frame until the returned stop() is called. */
export type FrameLoop = (tick: () => void) => () => void;

export const animationFrames: FrameLoop = (tick) => {
  let id = requestAnimationFrame(function loop() {
    tick();
    id = requestAnimationFrame(loop);
  });
  return () => cancelAnimationFrame(id);
};

/**
 * Calls `fn` once after `ms`, unless cancelled with the returned function.
 * Countdowns reschedule it for the exact moment their display next changes.
 */
export type Delay = (fn: () => void, ms: number) => () => void;

export const browserDelay: Delay = (fn, ms) => {
  const id = setTimeout(fn, ms);
  return () => clearTimeout(id);
};
