// Test-only fakes for injected time. Not imported by the app.
import type { Clock } from './clock';
import type { Scheduler, TimerHandle } from './scheduler';

interface Timer {
  readonly id: number;
  readonly at: number;
  readonly callback: () => void;
}

export interface FakeTime {
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  /** Moves time forward, running each timer that falls due, in order. */
  advance(ms: number): void;
  /** Timers still waiting. */
  pending(): number;
  nowMs(): number;
}

export function createFakeTime(startIso = '2026-11-07T04:00:00Z'): FakeTime {
  let now = Date.parse(startIso);
  let nextId = 1;
  let timers: Timer[] = [];

  const scheduler: Scheduler = {
    setTimeout(callback, ms) {
      const timer = { id: nextId++, at: now + ms, callback };
      timers.push(timer);
      return timer.id as unknown as TimerHandle;
    },
    clearTimeout(handle: TimerHandle) {
      timers = timers.filter((t) => (t.id as unknown) !== handle);
    },
  };

  function advance(ms: number) {
    const end = now + ms;
    for (;;) {
      const due = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      timers = timers.filter((t) => t !== due);
      now = due.at;
      due.callback();
    }
    now = end;
  }

  return {
    clock: { now: () => new Date(now) },
    scheduler,
    advance,
    pending: () => timers.length,
    nowMs: () => now,
  };
}
