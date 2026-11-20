import type { Portraits } from '@/core/portrait';
import { h } from '../dom';
import type { JournalCell } from '../journalView';
import { portrait } from './portrait';

/** Screen pixels per sprite pixel in the grid. */
const SCALE = 2;

/**
 * The journal's grid. A found animal is a button (its sprite, or its emoji
 * until the sprite is ready) that opens its page; one not found yet is a dark
 * silhouette with a "?", not focusable and with no name, so nothing is given away.
 */
export function journalGrid(
  cells: readonly JournalCell[],
  opts: { readonly portraits?: Portraits | undefined; open(cell: JournalCell): void },
): HTMLElement {
  const items = cells.map((cell) => {
    if (!cell.entry) {
      return h(
        'li',
        { class: 'journal-cell journal-cell--unknown' },
        h('span', { class: 'journal-cell__silhouette', 'aria-hidden': 'true' }, cell.animal.emoji),
        h('span', { class: 'journal-cell__mark', 'aria-hidden': 'true' }, '?'),
        h('span', { class: 'sr-only' }, 'Not found yet'),
      );
    }
    const button = h(
      'button',
      { class: 'journal-cell__button', type: 'button', 'aria-label': cell.animal.display },
      portrait(cell.animal, false, { scale: SCALE, portraits: opts.portraits }),
    );
    button.addEventListener('click', () => opts.open(cell));
    return h('li', { class: 'journal-cell' }, button);
  });
  return h('ul', { class: 'journal-grid' }, ...items);
}
