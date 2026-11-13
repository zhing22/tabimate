import type { Portraits } from '@/core/portrait';
import type { TierId } from '@/config/tiers';
import type { Animal, Prompt, RoundResult } from '@/core/types';
import { h } from '../dom';
import type { Component } from './component';
import { portrait } from './portrait';
import { tierBadge } from './tierBadge';

/** One answer to a prompt, as the results list it. */
export interface AnswerLine {
  readonly name: string;
  readonly tier: TierId;
  readonly points: number;
  /** The one the player found. */
  readonly picked: boolean;
}

export interface TeamRound {
  readonly prompt: Prompt;
  readonly result: RoundResult;
  /** The matched animal; null for a miss. */
  readonly animal: Animal | null;
  /** Every answer the prompt accepted, rarest first. */
  readonly answers: readonly AnswerLine[];
}

const SCALE = 2;

function answerList(answers: readonly AnswerLine[]) {
  return h(
    'ul',
    { class: 'team-card__answers' },
    ...answers.map((a) =>
      h(
        'li',
        { class: a.picked ? 'answer-line answer-line--picked' : 'answer-line' },
        h('span', { class: 'answer-line__name' }, a.name),
        h('span', { class: 'answer-line__points' }, `${a.points}`),
        a.picked ? h('span', { class: 'sr-only' }, ' (your answer)') : null,
      ),
    ),
  );
}

/**
 * The run as a list: each prompt with the animal that joined (its sprite,
 * name and tier), or a miss. Each opens to show every answer the prompt
 * accepted and what it was worth, names only.
 */
export function teamCard(rounds: readonly TeamRound[], portraits?: Portraits): Component {
  const el = h(
    'ol',
    { class: 'team-card' },
    ...rounds.map(({ prompt, result, animal, answers }) =>
      h(
        'li',
        { 'data-tier': result.match.tier },
        h(
          'details',
          { class: 'team-card__member' },
          h(
            'summary',
            { class: 'team-card__summary' },
            animal
              ? portrait(animal, result.match.tier === 5, { scale: SCALE, portraits })
              : h('span', { class: 'portrait', 'aria-hidden': 'true' }, '·'),
            h(
              'span',
              { class: 'team-card__text' },
              h('span', { class: 'team-card__name' }, animal?.display ?? 'No match'),
              h('span', { class: 'team-card__prompt' }, prompt.text),
            ),
            tierBadge(result.match.tier, { compact: true }).el,
          ),
          h('p', { class: 'team-card__answers-title' }, `All ${answers.length} answers · points`),
          answerList(answers),
        ),
      ),
    ),
  );
  return { el, destroy: () => {} };
}
