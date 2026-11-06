import type { Clock } from '@/core/clock';

/** The real clock. Lives outside core/ because it reads the system time. */
export const systemClock: Clock = {
  now: () => new Date(),
};
