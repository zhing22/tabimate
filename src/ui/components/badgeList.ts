import { h } from '../dom';
import { formatDateKey } from '../format';
import type { BadgeLine } from '../journalView';

/** Achievements: unlocked ones with their date, locked ones dimmed with what to do. */
export function badgeList(lines: readonly BadgeLine[]): HTMLElement {
  return h(
    'ul',
    { class: 'badge-list' },
    ...lines.map(({ achievement, unlockedKey }) =>
      h(
        'li',
        { class: unlockedKey ? 'badge' : 'badge badge--locked' },
        h('span', { class: 'badge__icon', 'aria-hidden': 'true' }, achievement.icon),
        h(
          'span',
          { class: 'badge__body' },
          h('strong', { class: 'badge__name' }, achievement.name),
          h('span', { class: 'badge__text' }, achievement.description),
          h(
            'span',
            { class: 'badge__when' },
            unlockedKey ? `Unlocked ${formatDateKey(unlockedKey)}` : 'Locked',
          ),
        ),
      ),
    ),
  );
}
