import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import type { JournalEntry } from '@/core/journal/journal';
import type { Animal } from '@/core/types';
import { h } from '../dom';
import { formatDateKey } from '../format';
import type { JournalCell } from '../journalView';
import { portrait } from './portrait';

const timesText = (n: number) => (n === 1 ? 'Found once' : `Found ${n} times`);

/**
 * A found animal's journal page: the animal moving (its sprite's walk, flap or
 * swim; an emoji hops), name, description, and one line
 * with the Wikipedia link, when it was first found and how often; a corner ×
 * closes it. No level badge: an animal's level belongs to a prompt, not to it.
 * `close` puts focus back where the player was.
 */
export function journalDetail(
  cell: JournalCell,
  close: () => void,
  portraits?: Portraits,
): HTMLElement {
  const { animal, entry } = cell;
  const title = h('h2', { class: 'section-title', tabindex: -1 }, animal.display);
  const el = h(
    'section',
    { class: 'journal-detail', 'aria-label': animal.display },
    h(
      'div',
      { class: 'journal-detail__animal' },
      portrait(animal, false, { scale: UI_SPRITE_SCALE.journalDetail, portraits, walking: true }),
    ),
    h('div', { class: 'journal-detail__head' }, title),
    animal.description
      ? h('p', { class: 'journal-detail__description' }, animal.description)
      : null,
    detailMeta(animal, entry),
    closeButton(close),
  );
  queueMicrotask(() => title.focus());
  return el;
}

/** A small × in the corner, so the page stays compact (named "Close" for screen readers). */
function closeButton(close: () => void): HTMLElement {
  const button = h(
    'button',
    { class: 'journal-detail__close', type: 'button' },
    h('span', { 'aria-hidden': 'true' }, '×'),
    h('span', { class: 'sr-only' }, 'Close'),
  );
  button.addEventListener('click', close);
  return button;
}

/** One line: the Wikipedia link, then when it was first found and how often. */
function detailMeta(animal: Animal, entry: JournalEntry | null): HTMLElement {
  return h(
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
  );
}
