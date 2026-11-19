import { isShiny } from '@/config/levels';
import type { Portraits } from '@/core/portrait';
import { pointsFor } from '@/core/scoring';
import type { Animal, Prompt, RoundResult } from '@/core/types';
import { h } from '../dom';
import { answerList, type AnswerList } from './answerList';
import { groupTag, type AnswerLine } from './answerRow';
import type { Component } from './component';
import { levelBadge } from './levelBadge';
import { portrait } from './portrait';

export type { AnswerLine };

export interface TeamRound {
  readonly prompt: Prompt;
  readonly result: RoundResult;
  /** The matched animal; null for a miss. */
  readonly animal: Animal | null;
  /** Every answer the prompt accepted, rarest first. */
  readonly answers: readonly AnswerLine[];
}

const SCALE = 2;

/** The row: "Q3 · the full prompt", then the animal (and a group tag), then "VU · 50". */
function summary(round: TeamRound, index: number, portraits: Portraits | undefined) {
  const { prompt, result, animal } = round;
  const level = result.match.level;
  return h(
    'summary',
    { class: 'team-card__summary' },
    animal
      ? portrait(animal, isShiny(level), { scale: SCALE, portraits })
      : h('span', { class: 'portrait', 'aria-hidden': 'true' }, '·'),
    h(
      'span',
      { class: 'team-card__text' },
      h('span', { class: 'team-card__prompt' }, `Q${index + 1} · ${prompt.text}`),
      h(
        'span',
        { class: 'team-card__name' },
        animal?.display ?? 'No match',
        animal?.kind === 'group' ? groupTag() : null,
      ),
      h(
        'span',
        { class: 'team-card__score' },
        levelBadge(level, { compact: true }).el,
        h('span', { class: 'team-card__points' }, ` · ${pointsFor(level)}`),
      ),
    ),
  );
}

/**
 * The run as a list: each prompt in full with the animal that joined (sprite,
 * name, level and points), or a miss. Each opens to every answer the prompt
 * accepted; the list is built on first open, then scrolls to the player's own.
 */
export function teamCard(rounds: readonly TeamRound[], portraits?: Portraits): Component {
  const lists: AnswerList[] = [];
  const el = h(
    'ol',
    { class: 'team-card' },
    ...rounds.map((round, i) => {
      const details = h('details', { class: 'team-card__member' }, summary(round, i, portraits));
      let list: AnswerList | null = null;
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        if (!list) {
          list = answerList(round.answers, { question: `Q${i + 1}` });
          lists.push(list);
          details.append(list.el);
        }
        list.reveal();
      });
      return h('li', {}, details);
    }),
  );
  return { el, destroy: () => lists.forEach((l) => l.destroy()) };
}
