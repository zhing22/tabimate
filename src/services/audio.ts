import { REVEAL_TIMING, TIMER_WARN_MS, revealBuildUpMs, type RevealTiming } from '@/config/game';
import type { Clock } from '@/core/clock';
import type { GameBus } from '@/core/events';
import type { StorageAdapter } from '@/core/storage';
import { SOUNDS, tierSound, type SoundName } from './sounds';

export const MUTED_KEY = 'tabimate.muted';
/** Everything is quiet blips; this keeps them comfortably below full scale. */
const MASTER_VOLUME = 0.5;
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;

export interface AudioDeps {
  readonly bus: GameBus;
  readonly storage: StorageAdapter;
  readonly clock: Clock;
  /** Browsers only allow sound after a tap or key press, on this target. */
  readonly unlockOn?: EventTarget;
  readonly createContext?: () => AudioContext;
  /** Must match the UI's, so a tier's sound plays as its badge pops. */
  readonly revealTiming?: RevealTiming;
}

export interface GameAudio {
  readonly muted: boolean;
  setMuted(muted: boolean): void;
  dispose(): void;
}

/**
 * All game sound, driven only by bus events: nothing else plays audio. Sounds
 * are synthesised (services/sounds.ts). The context is made on the first tap
 * or key press, as browsers require; until then everything is silent.
 */
export function createAudio(deps: AudioDeps): GameAudio {
  const timing = deps.revealTiming ?? REVEAL_TIMING;
  const unlockOn = deps.unlockOn ?? document;
  const createContext = deps.createContext ?? (() => new AudioContext());
  let muted = deps.storage.get(MUTED_KEY) === true;
  let ctx: AudioContext | null = null;
  let lastJoins = false; // whether the answer being revealed brings a follower
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const ticks = new Set<ReturnType<typeof setTimeout>>();

  const unlock = () => {
    try {
      ctx ??= createContext();
      if (ctx.state === 'suspended') void ctx.resume();
    } catch {
      ctx = null; // no Web Audio here: the game is silent, and that's fine
    }
    for (const type of UNLOCK_EVENTS) unlockOn.removeEventListener(type, unlock);
  };
  for (const type of UNLOCK_EVENTS) unlockOn.addEventListener(type, unlock);

  function play(name: SoundName) {
    if (muted || !ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime + 0.01;
    for (const n of SOUNDS[name]) {
      const t0 = start + n.at;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.wave;
      osc.frequency.setValueAtTime(n.freq, t0);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.dur);
      // A 5 ms attack and an exponential decay: no clicks at either end.
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(n.gain * MASTER_VOLUME, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
    }
  }

  const later = (set: Set<ReturnType<typeof setTimeout>>, ms: number, name: SoundName) => {
    const timer = setTimeout(() => {
      set.delete(timer);
      play(name);
    }, ms);
    set.add(timer);
  };
  const cancel = (set: Set<ReturnType<typeof setTimeout>>) => {
    for (const timer of set) clearTimeout(timer);
    set.clear();
  };

  const stops = [
    // A tick for each of the round's last seconds.
    deps.bus.on('roundStarted', ({ endsAt }) => {
      cancel(ticks);
      const now = deps.clock.now().getTime();
      for (let s = TIMER_WARN_MS / 1000; s >= 1; s--) {
        const at = endsAt - s * 1000 - now;
        if (at >= 0) later(ticks, at, 'tick');
      }
    }),
    // The tier's sound lands on the badge pop, after the same drum-roll as the UI.
    deps.bus.on('answerMatched', ({ result }) => {
      cancel(ticks);
      lastJoins = result.match.animalId !== null;
      later(timers, revealBuildUpMs(result.match.tier, timing), tierSound(result.match.tier));
    }),
    deps.bus.on('answerRejected', () => play('miss')),
    deps.bus.on('answerSuggested', () => play('hint')),
    deps.bus.on('revealFinished', () => {
      if (lastJoins) play('join');
    }),
    deps.bus.on('runFinished', () => cancel(ticks)),
  ];

  return {
    get muted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
      deps.storage.set(MUTED_KEY, value);
    },
    dispose() {
      for (const stop of stops) stop();
      cancel(timers);
      cancel(ticks);
      for (const type of UNLOCK_EVENTS) unlockOn.removeEventListener(type, unlock);
      void ctx?.close();
    },
  };
}
