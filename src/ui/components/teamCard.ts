import { isShiny } from '@/config/levels';
import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import { pickedShare, type DayStats } from '@/core/stats';
import { pointsFor } from '@/core/scoring';
import type { Animal, Prompt, RoundResult } from '@/core/types';
import { h } from '../dom';
import { formatShare } from '../format';
import { answerList, type AnswerList } from './answerList';
import type { AnswerLine } from './answerRow';
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

const SCALE = UI_SPRITE_SCALE.team;

/** The row: picture, "Q3 · the full prompt" over the animal, and "VU · 50" at the right. */
function summary(round: TeamRound, index: number, portraits: Portraits | undefined) {
  const { prompt, result, animal } = round;
  const level = result.match.level;
  return h(
    'summary',
    { class: 'team-card__summary' },
    // A fixed-size slot (team.css), so every row's text starts at the same place
    // whether its picture is a small sprite, a large one or an emoji.
    h(
      'span',
      { class: 'team-card__picture' },
      animal
        ? portrait(animal, isShiny(level), { scale: SCALE, portraits })
        : h('span', { class: 'portrait', 'aria-hidden': 'true' }, '·'),
    ),
    h(
      'span',
      { class: 'team-card__text' },
      h('span', { class: 'team-card__prompt' }, `Q${index + 1} · ${prompt.text}`),
      h('span', { class: 'team-card__name' }, animal?.display ?? 'No match'),
    ),
    // Its own column at the right, centred against the question and the answer.
    h(
      'span',
      { class: 'team-card__score' },
      levelBadge(level, { compact: true }).el,
      ` · ${pointsFor(level)}`,
    ),
  );
}

/**
 * The run as a list: each prompt in full with the animal that joined (sprite,
 * name, level and points), or a miss. Each opens to every answer the prompt
 * accepted; the list is built on first open, then scrolls to the player's own.
 */
export interface TeamCard extends Component {
  /**
   * Players' picks, once they arrive: "12% picked this" under each answer
   * and a share beside every answer in its list. Prompts with too few players
   * (pickedShare null) show none.
   */
  showShares(stats: DayStats): void;
}

export function teamCard(rounds: readonly TeamRound[], portraits?: Portraits): TeamCard {
  const lists: AnswerList[] = [];
  let stats: DayStats | null = null;
  const shareOf = (round: TeamRound) => (animalId: string) =>
    pickedShare(stats, round.prompt.id, animalId);
  const el = h(
    'ol',
    { class: 'team-card' },
    ...rounds.map((round, i) => {
      const details = h('details', { class: 'team-card__member' }, summary(round, i, portraits));
      let list: AnswerList | null = null;
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        if (!list) {
          list = answerList(round.answers, { question: `Q${i + 1}`, share: shareOf(round) });
          lists.push(list);
          details.append(list.el);
        }
      });
      return h('li', {}, details);
    }),
  );
  return {
    el,
    showShares(next) {
      stats = next;
      rounds.forEach((round, i) => {
        const id = round.result.match.animalId;
        const share = id === null ? null : shareOf(round)(id);
        const text = el.children[i]?.querySelector('.team-card__text');
        text?.querySelector('.team-card__share')?.remove();
        if (share !== null)
          text?.append(
            h('span', { class: 'team-card__share' }, `${formatShare(share)} picked this`),
          );
      });
      lists.forEach((l) => l.refresh());
    },
    destroy: () => lists.forEach((l) => l.destroy()),
  };
}
