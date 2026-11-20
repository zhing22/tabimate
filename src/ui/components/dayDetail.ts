import { MISS_EMOJI } from '@/config/game';
import { LEVELS } from '@/config/levels';
import { h } from '../dom';
import { formatDateKey } from '../format';
import type { DayDetail } from '../historyView';
import { levelBadge } from './levelBadge';

/** "648 points (base 540 before the bonus)", or just "540 points". */
const scoreText = ({ score, base }: DayDetail): string =>
  score === base ? `${score} points` : `${score} points (base ${base} before the bonus)`;

/** A past day: its score, how far it went, and the team that answered. */
export function dayDetail(detail: DayDetail): HTMLElement {
  const title = h('h2', { class: 'section-title', tabindex: -1 }, formatDateKey(detail.key));
  const rows = detail.team.map(({ level, animal }) =>
    h(
      'li',
      { class: 'day-detail__row' },
      h('span', { 'aria-hidden': 'true' }, animal?.emoji ?? (level === 0 ? MISS_EMOJI : '·')),
      h(
        'span',
        { class: 'day-detail__name' },
        animal?.display ?? (level === 0 ? 'No answer' : LEVELS[level].name),
      ),
      level === 0 ? null : levelBadge(level, { compact: true }).el,
    ),
  );
  const el = h(
    'section',
    { class: 'day-detail', 'aria-label': formatDateKey(detail.key) },
    title,
    h('p', { class: 'meta' }, `${scoreText(detail)} · ${detail.bandLabel} · ${detail.biomeName}`),
    h('ul', { class: 'day-detail__team' }, ...rows),
    detail.hasAnimals ? null : h('p', { class: 'meta' }, 'Only the levels were kept for this day.'),
  );
  queueMicrotask(() => title.focus());
  return el;
}
