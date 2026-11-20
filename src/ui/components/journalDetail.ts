import { h } from '../dom';
import { formatDateKey } from '../format';
import type { JournalCell } from '../journalView';
import { levelBadge } from './levelBadge';

const timesText = (n: number) => (n === 1 ? 'Found once' : `Found ${n} times`);

/**
 * A found animal's journal page: name, rarest level found, description,
 * Wikipedia link, when it was first found and how often. `close` puts focus
 * back where the player was.
 */
export function journalDetail(cell: JournalCell, close: () => void): HTMLElement {
  const { animal, entry } = cell;
  const closeButton = h(
    'button',
    { class: 'button journal-detail__close', type: 'button' },
    'Close',
  );
  closeButton.addEventListener('click', close);
  const title = h('h2', { class: 'section-title', tabindex: -1 }, animal.display);
  const el = h(
    'section',
    { class: 'journal-detail', 'aria-label': animal.display },
    h(
      'div',
      { class: 'journal-detail__head' },
      title,
      entry ? levelBadge(entry.bestLevel).el : null,
    ),
    animal.description
      ? h('p', { class: 'journal-detail__description' }, animal.description)
      : null,
    animal.wiki
      ? h(
          'a',
          { href: animal.wiki, target: '_blank', rel: 'noopener', class: 'answer__wiki' },
          'Read more on Wikipedia',
        )
      : null,
    entry
      ? h(
          'p',
          { class: 'meta' },
          `First found ${formatDateKey(entry.firstFoundKey)} · ${timesText(entry.timesFound)}`,
        )
      : null,
    closeButton,
  );
  queueMicrotask(() => title.focus());
  return el;
}
