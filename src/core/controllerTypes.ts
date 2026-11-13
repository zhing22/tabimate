import type { MatcherConfig } from '@/config/game';
import type { Clock } from './clock';
import type { GameBus } from './events';
import type { Scheduler } from './scheduler';
import type { Animal, AnimalId, GameMode, Puzzle, RunState } from './types';

export interface GameControllerDeps {
  readonly puzzle: Puzzle;
  readonly animals: ReadonlyMap<AnimalId, Animal>;
  readonly bus: GameBus;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly matcherConfig?: MatcherConfig;
  readonly mode?: GameMode;
  readonly timing?: { readonly roundTimeMs: number };
}

/** The UI talks to the game only through these; it never touches state. */
export interface GameController {
  start(): void;
  /**
   * Tries a guess. Only an animal's exact name is scored and revealed. A guess
   * that is close to an answer (alias, typo, part of the name, near miss)
   * emits answerSuggested with that animal's name, for the player to confirm;
   * one that matches nothing emits answerRejected. Either way the round goes on.
   */
  submit(input: string): void;
  /**
   * What is in the answer box right now. When time runs out it is submitted
   * as it stands: scored if it is an exact name, 0 points otherwise.
   */
  setDraft(text: string): void;
  /**
   * Moves on from the reveal: to the next prompt, or to the results after the
   * last one. The game waits on the reveal until this is called.
   */
  next(): void;
  /** Loads a saved run into a fresh controller. False (and no change) if it doesn't fit. */
  restore(saved: RunState): boolean;
  getState(): RunState;
  /** Stops the round timer; the controller ignores calls afterwards. */
  dispose(): void;
}
