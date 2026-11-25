import { h } from '../dom';
import { pixelSvg } from './pixelArt';
import { BOOK_ICON, CALENDAR_ICON, MEDAL_ICON } from './pixelIcons';

export interface CollectionLinks {
  journal(): void;
  achievements(): void;
  history(): void;
}

function tile(icon: readonly string[], label: string, onClick: () => void): HTMLButtonElement {
  const button = h(
    'button',
    { class: 'tile', type: 'button' },
    pixelSvg(icon, 'tile__icon'),
    h('span', { class: 'tile__label' }, label),
  );
  button.addEventListener('click', onClick);
  return button;
}

/**
 * The Field Journal, Achievements and History tiles: a pixel icon over the
 * label, side by side and centred (start, results and the summary).
 */
export function collectionLinks(actions: CollectionLinks): HTMLElement {
  return h(
    'div',
    { class: 'tiles collection-links' },
    tile(BOOK_ICON, 'Field Journal', () => actions.journal()),
    tile(MEDAL_ICON, 'Achievements', () => actions.achievements()),
    tile(CALENDAR_ICON, 'History', () => actions.history()),
  );
}
