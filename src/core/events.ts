import type { BiomeDef } from '@/config/biomes';
import type { DateKey, GameMode, Prompt, RoundResult, RunState } from './types';

export type Listener<T> = (payload: T) => void;

export interface Bus<M> {
  /** Returns a function that removes this listener. */
  on<K extends keyof M>(type: K, listener: Listener<M[K]>): () => void;
  off<K extends keyof M>(type: K, listener: Listener<M[K]>): void;
  emit<K extends keyof M>(type: K, payload: M[K]): void;
}

/** A tiny typed event bus. M maps each event name to its payload type. */
export function createBus<M>(): Bus<M> {
  const listeners: { [K in keyof M]?: Set<Listener<M[K]>> } = {};

  const off = <K extends keyof M>(type: K, listener: Listener<M[K]>): void => {
    listeners[type]?.delete(listener);
  };

  return {
    on(type, listener) {
      const set = listeners[type] ?? new Set();
      set.add(listener);
      listeners[type] = set;
      return () => off(type, listener);
    },
    off,
    emit(type, payload) {
      // A copy, so listeners may unsubscribe (or subscribe) while being called.
      for (const listener of [...(listeners[type] ?? [])]) listener(payload);
    },
  };
}

/** Everything the game tells the UI and the scene. Both only listen. */
export interface GameEvents {
  runStarted: { mode: GameMode; puzzleDate: DateKey; promptCount: number };
  /** A saved run was loaded; listeners redraw everything from `state`. */
  runRestored: { state: RunState };
  /** endsAt is epoch ms from the injected clock. */
  roundStarted: { index: number; prompt: Prompt; endsAt: number };
  answerMatched: { round: number; result: RoundResult };
  revealFinished: { index: number };
  biomeEntered: { biome: BiomeDef };
  runFinished: { results: readonly RoundResult[]; score: number };
  /** After every state change, e.g. so the run can be saved. */
  stateChanged: { state: RunState };
}

export type GameBus = Bus<GameEvents>;
