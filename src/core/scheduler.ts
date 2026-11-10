declare const timerHandle: unique symbol;

/** Whatever the scheduler's setTimeout returned; opaque, only good for clearTimeout. */
export type TimerHandle = { readonly [timerHandle]: true };

/**
 * Timers, injected like Clock so tests can fake time. The real one is
 * services/browserScheduler.ts.
 */
export interface Scheduler {
  setTimeout(callback: () => void, ms: number): TimerHandle;
  clearTimeout(handle: TimerHandle): void;
}
