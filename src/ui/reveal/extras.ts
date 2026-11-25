// Extra lines under the revealed name: a registry, so adding one means adding
// an entry. Each says whether it has something to show for this result, and
// renders it. They appear in REVEAL_EXTRAS order.
import type { Animal, AnimalLookup, Prompt, RoundResult } from '@/core/types';
import { h } from '../dom';
import { betterChild, nearMissText } from './nearMiss';

export interface RevealContext {
  /** The matched animal; null for a miss. */
  readonly animal: Animal | null;
  /** The prompt answered, with every accepted answer and its level. */
  readonly prompt: Prompt;
  readonly animals: AnimalLookup;
}

export interface RevealExtra {
  readonly id: string;
  appliesTo(result: RoundResult, ctx: RevealContext): boolean;
  render(result: RoundResult, ctx: RevealContext): HTMLElement;
}

/** The animal's one-line description, when it has one. */
const factLine: RevealExtra = {
  id: 'factLine',
  appliesTo: (_, { animal }) => Boolean(animal?.description),
  render: (_, { animal }) =>
    h('p', { class: 'reveal-extra reveal-extra--fact' }, animal?.description ?? ''),
};

/** A group answer: the rarer species under it that would have scored more (never the CR). */
const nearMiss: RevealExtra = {
  id: 'nearMiss',
  appliesTo: ({ match }, { animal, prompt, animals }) =>
    match.level !== 0 &&
    animal?.kind === 'group' &&
    betterChild(prompt, animal, match.level, animals) !== null,
  render: ({ match }, { animal, prompt, animals }) => {
    if (match.level === 0 || !animal) return h('p', {});
    const child = betterChild(prompt, animal, match.level, animals)!;
    return h(
      'p',
      { class: 'reveal-extra reveal-extra--near-miss' },
      nearMissText(animal, match.level, child),
    );
  },
};

/**
 * Shown in this order: the fact, then the hint. (A top-level find's jackpot
 * is inside the level badge, and a first-ever find's "New" ribbon is on the
 * sprite: screens/reveal.ts.)
 */
export const REVEAL_EXTRAS: readonly RevealExtra[] = [factLine, nearMiss];

/** The extras that apply to a result, rendered in order. */
export const revealExtras = (result: RoundResult, ctx: RevealContext): HTMLElement[] =>
  REVEAL_EXTRAS.filter((extra) => extra.appliesTo(result, ctx)).map((extra) =>
    extra.render(result, ctx),
  );
