// Test-only helpers for the UI tests. Not imported by the app.
import type { FrameLoop, Interval } from './frames';

/**
 * Hand-cranked time for UI components: set() moves the clock and runs every
 * frame loop and interval once, so tests can check what is drawn at a moment.
 */
export function manualTime(start = 0) {
  let now = start;
  const ticks = new Set<() => void>();
  const add = (tick: () => void) => {
    const entry = () => tick();
    ticks.add(entry);
    return () => ticks.delete(entry);
  };
  const frames: FrameLoop = (tick) => {
    const stop = add(tick);
    return () => void stop();
  };
  const interval: Interval = (tick) => {
    const stop = add(tick);
    return () => void stop();
  };
  return {
    now: () => now,
    frames,
    interval,
    set(ms: number) {
      now = ms;
      for (const tick of [...ticks]) tick();
    },
    running: () => ticks.size,
  };
}

/** Types into an input the way a player does, firing the input event. */
export function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Presses Enter in a form: submits it (and runs its submit handler). */
export function pressEnter(input: HTMLInputElement): void {
  input.form?.requestSubmit();
}

/** A key press on an element, as keydown (what the round screen listens for). */
export function pressKey(el: HTMLElement, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}
