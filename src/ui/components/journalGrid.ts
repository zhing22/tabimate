import { UI_SPRITE_SCALE } from '@/config/render';
import type { Portraits } from '@/core/portrait';
import { h } from '../dom';
import type { JournalCell } from '../journalView';
import { portrait } from './portrait';

const SCALE = UI_SPRITE_SCALE.journal;
/** What an animal not found yet is called: nothing is given away. */
export const UNKNOWN_NAME = '???';

/**
 * The journal's grid: each animal's picture with its name in small type under
 * it. A found one is a button (its sprite, or its emoji until the sprite is
 * ready) that opens its page; one not found yet is a dark silhouette named
 * "???", not focusable, so nothing is given away.
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
        h(
          'span',
          { class: 'journal-cell__picture', 'aria-hidden': 'true' },
          h('span', { class: 'journal-cell__silhouette' }, cell.animal.emoji),
          h('span', { class: 'journal-cell__mark' }, '?'),
        ),
        h('span', { class: 'journal-cell__name', 'aria-hidden': 'true' }, UNKNOWN_NAME),
        h('span', { class: 'sr-only' }, 'Not found yet'),
      );
    }
    const button = h(
      'button',
      { class: 'journal-cell__button', type: 'button' },
      h(
        'span',
        { class: 'journal-cell__picture' },
        portrait(cell.animal, false, { scale: SCALE, portraits: opts.portraits }),
      ),
      h('span', { class: 'journal-cell__name' }, cell.animal.display),
    );
    button.addEventListener('click', () => opts.open(cell));
    return h('li', { class: 'journal-cell' }, button);
  });
  return h('ul', { class: 'journal-grid' }, ...items);
}
