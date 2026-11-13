// Test-only helpers for the UI tests. Not imported by the app.
import type { Delay, FrameLoop } from './frames';

/**
 * Hand-cranked time for UI components: set() moves the clock, runs every frame
 * loop once, and fires every delay that has come due (in order), so tests can
 * check what is drawn at a moment.
 */
export function manualTime(start = 0) {
  let now = start;
  const ticks = new Set<() => void>();
  const delays = new Set<{ due: number; fn: () => void }>();
  const frames: FrameLoop = (tick) => {
    const entry = () => tick();
    ticks.add(entry);
    return () => void ticks.delete(entry);
  };
  const delay: Delay = (fn, ms) => {
    const entry = { due: now + ms, fn };
    delays.add(entry);
    return () => void delays.delete(entry);
  };
  return {
    now: () => now,
    frames,
    delay,
    set(ms: number) {
      now = ms;
      for (const tick of [...ticks]) tick();
      for (;;) {
        const next = [...delays].filter((d) => d.due <= now).sort((a, b) => a.due - b.due)[0];
        if (!next) break;
        delays.delete(next);
        next.fn();
      }
    },
    running: () => ticks.size + delays.size,
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
