import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import { h } from '../dom';
import type { JournalCell } from '../journalView';
import { portrait } from './portrait';

const SCALE = UI_SPRITE_SCALE.journal;
/** What an animal not found yet is called: nothing is given away. */
export const UNKNOWN_NAME = '???';

export interface JournalGrid {
  readonly el: HTMLElement;
  /** Stops watching for cells scrolling into view. */
  destroy(): void;
}

/**
 * The journal's grid: each animal's picture with its name in small type under
 * it. A found one is a button (its emoji, swapped for its sprite once the cell
 * scrolls into view) that opens its page; one not found yet is a dark
 * silhouette named "???", not focusable, so nothing is given away.
 */
export function journalGrid(
  cells: readonly JournalCell[],
  opts: { readonly portraits?: Portraits | undefined; open(cell: JournalCell): void },
): JournalGrid {
  const lazy = lazyPictures(opts.portraits);
  const items = cells.map((cell) => {
    if (!cell.entry) return unknownCell(cell);
    const picture = h(
      'span',
      { class: 'journal-cell__picture' },
      portrait(cell.animal, false, { scale: SCALE }),
    );
    lazy.watch(picture, cell);
    const button = h(
      'button',
      { class: 'journal-cell__button', type: 'button' },
      picture,
      h('span', { class: 'journal-cell__name' }, cell.animal.display),
    );
    button.addEventListener('click', () => opts.open(cell));
    return h('li', { class: 'journal-cell' }, button);
  });
  return { el: h('ul', { class: 'journal-grid' }, ...items), destroy: lazy.destroy };
}

function unknownCell(cell: JournalCell): HTMLElement {
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

/**
 * Sprites only for cells on screen: each is recoloured on the main thread, so
 * a long-time player's hundreds of finds would all be drawn as the journal
 * opens. A cell keeps its emoji until it scrolls into view. Without an
 * IntersectionObserver (old browsers, tests) every cell loads at once.
 */
function lazyPictures(portraits: Portraits | undefined) {
  const waiting = new Map<Element, JournalCell>();
  const load = (picture: Element, cell: JournalCell) =>
    picture.replaceChildren(portrait(cell.animal, false, { scale: SCALE, portraits }));
  const observer =
    portraits && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const cell = waiting.get(entry.target);
            if (!entry.isIntersecting || !cell) continue;
            load(entry.target, cell);
            waiting.delete(entry.target);
            observer?.unobserve(entry.target);
          }
        })
      : null;
  return {
    watch(picture: Element, cell: JournalCell) {
      if (!portraits) return;
      if (!observer) return load(picture, cell);
      waiting.set(picture, cell);
      observer.observe(picture);
    },
    destroy: () => observer?.disconnect(),
  };
}
