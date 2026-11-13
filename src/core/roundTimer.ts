import type { Scheduler, TimerHandle } from './scheduler';

/**
 * One round's countdown, plus what is in the answer box: time-up submits
 * that text as it stands, so the two belong together.
 */
export interface RoundTimer {
  /** Starts a round: forgets the last round's text; `onExpire` gets this round's. */
  start(ms: number, onExpire: (draft: string) => void): void;
  /** Stops the countdown without expiring (an answer came in, or dispose). */
  cancel(): void;
  setDraft(text: string): void;
  readonly draft: string;
}

export function createRoundTimer(scheduler: Scheduler): RoundTimer {
  let handle: TimerHandle | null = null;
  let draft = '';
  const cancel = () => {
    if (handle !== null) scheduler.clearTimeout(handle);
    handle = null;
  };
  return {
    start(ms, onExpire) {
      cancel();
      draft = '';
      handle = scheduler.setTimeout(() => {
        handle = null;
        onExpire(draft);
      }, ms);
    },
    cancel,
    setDraft(text) {
      draft = text;
    },
    get draft() {
      return draft;
    },
  };
}
