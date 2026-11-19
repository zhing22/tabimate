import type { Portraits } from '@/core/portrait';
import { isShiny, type LevelId } from '@/config/levels';
import type { Animal, Prompt, RoundResult } from '@/core/types';
import { h } from '../dom';
import type { Component } from './component';
import { portrait } from './portrait';
import { levelBadge } from './levelBadge';

/** One answer to a prompt, as the results list it. */
export interface AnswerLine {
  readonly name: string;
  readonly level: LevelId;
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
 * name and level), or a miss. Each opens to show every answer the prompt
 * accepted and what it was worth, names only.
 */
export function teamCard(rounds: readonly TeamRound[], portraits?: Portraits): Component {
  const el = h(
    'ol',
    { class: 'team-card' },
    ...rounds.map(({ prompt, result, animal, answers }) =>
      h(
        'li',
        { 'data-level': result.match.level },
        h(
          'details',
          { class: 'team-card__member' },
          h(
            'summary',
            { class: 'team-card__summary' },
            animal
              ? portrait(animal, isShiny(result.match.level), { scale: SCALE, portraits })
              : h('span', { class: 'portrait', 'aria-hidden': 'true' }, '·'),
            h(
              'span',
              { class: 'team-card__text' },
              h('span', { class: 'team-card__name' }, animal?.display ?? 'No match'),
              h('span', { class: 'team-card__prompt' }, prompt.text),
            ),
            levelBadge(result.match.level, { compact: true }).el,
          ),
          h('p', { class: 'team-card__answers-title' }, `All ${answers.length} answers · points`),
          answerList(answers),
        ),
      ),
    ),
  );
  return { el, destroy: () => {} };
}
