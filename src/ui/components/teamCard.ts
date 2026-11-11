import type { Animal, Prompt, RoundResult } from '@/core/types';
import { h } from '../dom';
import { tierBadge } from './tierBadge';
import type { Component } from './component';

export interface TeamRound {
  readonly prompt: Prompt;
  readonly result: RoundResult;
  /** The matched animal; null for a miss. */
  readonly animal: Animal | null;
}

/** The run as a list: each prompt with the animal that joined, or a miss. */
export function teamCard(rounds: readonly TeamRound[]): Component {
  const el = h(
    'ol',
    { class: 'team-card' },
    ...rounds.map(({ prompt, result, animal }) =>
      h(
        'li',
        { class: 'team-card__member', 'data-tier': result.match.tier },
        h('span', { class: 'team-card__emoji', 'aria-hidden': 'true' }, animal?.emoji ?? '·'),
        h(
          'span',
          { class: 'team-card__text' },
          h('span', { class: 'team-card__name' }, animal?.display ?? 'No match'),
          h('span', { class: 'team-card__prompt' }, prompt.text),
        ),
        tierBadge(result.match.tier, { compact: true }).el,
      ),
    ),
  );
  return { el, destroy: () => {} };
}
