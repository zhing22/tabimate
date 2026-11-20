import { REVEAL_TIMING, type RevealTiming } from '@/config/game';
import { pointsFor } from '@/core/scoring';
import type { Portraits } from '@/core/portrait';
import type { Animal, AnimalLookup, Puzzle, RoundResult } from '@/core/types';
import type { ScreenHost } from './host';
import { revealExtras } from './reveal/extras';
import { revealScreen } from './screens/reveal';

export interface RevealDeps {
  readonly host: ScreenHost;
  readonly puzzle: Puzzle;
  readonly animals: AnimalLookup;
  readonly animalOf: (result: RoundResult) => Animal | null;
  /** Whether this answer is a first-ever find (see collectionUi). */
  readonly isNew: (result: RoundResult, index: number) => boolean;
  readonly timing?: RevealTiming | undefined;
  /** The found animal's sprite on the card; without them, its emoji. */
  readonly portraits?: Portraits | undefined;
}

export interface RevealOptions {
  /** Focus the card's Next button (no round screen is mounted to keep focus in). */
  readonly focusNext: boolean;
  readonly revealed: (summary: string) => void;
  readonly next: () => void;
}

/** Shows round `index`'s result card over the round, with its extras. */
export function showRevealCard(
  deps: RevealDeps,
  index: number,
  result: RoundResult,
  opts: RevealOptions,
) {
  const animal = deps.animalOf(result);
  const prompt = deps.puzzle.prompts[index];
  const ctx = prompt && {
    animal,
    prompt,
    animals: deps.animals,
    newToJournal: animal !== null && deps.isNew(result, index),
  };
  deps.host.showOverlay(
    revealScreen,
    {
      result,
      animal,
      extras: ctx ? revealExtras(result, ctx) : [],
      points: pointsFor(result.match.level),
      timing: deps.timing ?? REVEAL_TIMING,
      isLast: index === deps.puzzle.prompts.length - 1,
      ...(deps.puzzle.bonus?.length ? { lastLabel: 'Bonus quiz' } : {}),
      focusNext: opts.focusNext,
      portraits: deps.portraits,
    },
    { revealed: opts.revealed, next: opts.next },
  );
}
