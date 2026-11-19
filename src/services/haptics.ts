import { REVEAL_TIMING, revealBuildUpMs, type RevealTiming } from '@/config/game';
import { LEVELS } from '@/config/levels';
import type { GameBus } from '@/core/events';
import type { StorageAdapter } from '@/core/storage';
import { MUTED_KEY } from './audio';

/** The one part of Navigator haptics needs; absent where vibration isn't supported. */
export interface Vibrator {
  vibrate?: (pattern: number[]) => boolean;
}

export interface HapticsDeps {
  readonly bus: GameBus;
  /** Read for the mute setting (the corner button), so one switch silences both. */
  readonly storage: StorageAdapter;
  readonly navigator?: Vibrator;
  /** Must match the UI's, so the buzz lands with the badge. */
  readonly revealTiming?: RevealTiming;
}

/**
 * A buzz as each answer's badge lands, stronger for rarer levels (LEVELS[].vibration).
 * Driven only by bus events, like audio. Does nothing where navigator.vibrate is
 * missing (most desktops, iOS Safari), or while the game is muted.
 */
export function createHaptics(deps: HapticsDeps): { dispose(): void } {
  const nav = deps.navigator ?? (typeof navigator === 'undefined' ? {} : navigator);
  const timing = deps.revealTiming ?? REVEAL_TIMING;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  if (typeof nav.vibrate !== 'function') return { dispose: () => {} };
  const vibrate = nav.vibrate.bind(nav);

  const stop = deps.bus.on('answerMatched', ({ result }) => {
    const { level } = result.match;
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        if (deps.storage.get(MUTED_KEY) === true) return;
        try {
          vibrate([...LEVELS[level].vibration]);
        } catch {
          // Some browsers throw instead of returning false (e.g. no user gesture yet).
        }
      },
      revealBuildUpMs(level, timing),
    );
    timers.add(timer);
  });

  return {
    dispose() {
      stop();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
}
