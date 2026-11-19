import { LEVELS, type AnswerLevel } from '@/config/levels';
import type { AnimalId } from '@/core/types';
import { h } from '../dom';

/** One answer to a prompt, as the results list it. */
export interface AnswerLine {
  readonly animalId: AnimalId;
  readonly name: string;
  readonly level: AnswerLevel;
  readonly points: number;
  /** The one the player found. */
  readonly picked: boolean;
  /** One line from animals.json, if it has one. */
  readonly description?: string | undefined;
  /** Its Wikipedia article, if it has one. */
  readonly wiki?: string | undefined;
}

/** "CR · 100": the level's short name and its points. */
export const levelPoints = (level: AnswerLevel | 0, points: number): string =>
  `${LEVELS[level].shortName} · ${points}`;

function details(answer: AnswerLine, id: string) {
  const link = answer.wiki
    ? h(
        'a',
        { href: answer.wiki, target: '_blank', rel: 'noopener', class: 'answer__wiki' },
        'Read more on Wikipedia',
      )
    : null;
  return h(
    'div',
    { class: 'answer__details', id, hidden: true },
    answer.description ? h('p', { class: 'answer__description' }, answer.description) : null,
    link ?? (answer.description ? null : h('p', {}, 'No details yet.')),
  );
}

/**
 * One answer: a button with its name, level and points that opens to its
 * description and Wikipedia link. Each row is tinted with its level's colour
 * (answers.css lightens it), so rarity reads at a glance; the player's own is
 * marked for sight and for screen readers.
 */
export function answerRow(answer: AnswerLine, id: string): HTMLLIElement {
  const panel = details(answer, `${id}-details`);
  const button = h(
    'button',
    {
      type: 'button',
      class: 'answer__row',
      'aria-expanded': 'false',
      'aria-controls': panel.id,
    },
    h('span', { class: 'answer__name' }, answer.name),
    h('span', { class: 'answer__level' }, levelPoints(answer.level, answer.points)),
    answer.picked ? h('span', { class: 'sr-only' }, ' (your answer)') : null,
  );
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.hidden = !open;
  });
  return h(
    'li',
    {
      class: answer.picked ? 'answer answer--picked' : 'answer',
      style: `--answer-tint: var(${LEVELS[answer.level].colour})`,
    },
    button,
    panel,
  );
}
