/**
 * Source of the current time. Core code receives a Clock instead of reading
 * the real time, so tests can pin it. The real one is services/systemClock.ts.
 */
export interface Clock {
  now(): Date;
}
