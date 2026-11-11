/** Calls `tick` once per animation frame until the returned stop() is called. */
export type FrameLoop = (tick: () => void) => () => void;

export const animationFrames: FrameLoop = (tick) => {
  let id = requestAnimationFrame(function loop() {
    tick();
    id = requestAnimationFrame(loop);
  });
  return () => cancelAnimationFrame(id);
};

/** Calls `tick` every `ms` until stopped. For displays that change once a second. */
export type Interval = (tick: () => void, ms: number) => () => void;

export const browserInterval: Interval = (tick, ms) => {
  const id = setInterval(tick, ms);
  return () => clearInterval(id);
};
