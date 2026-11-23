import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import { h } from '../dom';
import { formatDateKey } from '../format';
import type { JournalCell } from '../journalView';
import { levelBadge } from './levelBadge';
import { portrait } from './portrait';

const timesText = (n: number) => (n === 1 ? 'Found once' : `Found ${n} times`);

/**
 * A found animal's journal page: the animal moving (its sprite's walk, flap or
 * swim; an emoji hops), name, rarest level found, description, and one line
 * with the Wikipedia link, when it was first found and how often; a corner ×
 * closes it. `close` puts focus back where the
 * player was.
 */
export function journalDetail(
  cell: JournalCell,
  close: () => void,
  portraits?: Portraits,
): HTMLElement {
  const { animal, entry } = cell;
  // A small corner button, so the page stays compact.
  const closeButton = h(
    'button',
    { class: 'journal-detail__close', type: 'button' },
    h('span', { 'aria-hidden': 'true' }, '×'),
    h('span', { class: 'sr-only' }, 'Close'),
  );
  closeButton.addEventListener('click', close);
  const title = h('h2', { class: 'section-title', tabindex: -1 }, animal.display);
  const el = h(
    'section',
    { class: 'journal-detail', 'aria-label': animal.display },
    h(
      'div',
      { class: 'journal-detail__animal' },
      portrait(animal, false, { scale: UI_SPRITE_SCALE.journalDetail, portraits, walking: true }),
    ),
    h(
      'div',
      { class: 'journal-detail__head' },
      title,
      entry ? levelBadge(entry.bestLevel).el : null,
    ),
    animal.description
      ? h('p', { class: 'journal-detail__description' }, animal.description)
      : null,
    // One line under it: the Wikipedia link, then when it was first found.
    h(
      'p',
      { class: 'meta journal-detail__meta' },
      animal.wiki
        ? h(
            'a',
            { href: animal.wiki, target: '_blank', rel: 'noopener', class: 'answer__wiki' },
            'Wikipedia',
          )
        : null,
      animal.wiki && entry ? ' · ' : null,
      entry
        ? `First found ${formatDateKey(entry.firstFoundKey)} · ${timesText(entry.timesFound)}`
        : null,
    ),
    closeButton,
  );
  queueMicrotask(() => title.focus());
  return el;
}
