import type { Scheduler, TimerHandle } from '@/core/scheduler';

type BrowserTimer = ReturnType<typeof setTimeout>;

/** The real timers. Lives outside core/ because it uses the global setTimeout. */
export const browserScheduler: Scheduler = {
  setTimeout: (callback, ms) => setTimeout(callback, ms) as unknown as TimerHandle,
  clearTimeout: (handle) => clearTimeout(handle as unknown as BrowserTimer),
};
