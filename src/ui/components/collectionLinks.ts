import { h } from '../dom';

export interface CollectionLinks {
  journal(): void;
  achievements(): void;
  history(): void;
}

function tile(icon: string, label: string, onClick: () => void): HTMLButtonElement {
  const button = h(
    'button',
    { class: 'tile', type: 'button' },
    h('span', { class: 'tile__icon', 'aria-hidden': 'true' }, icon),
    h('span', { class: 'tile__label' }, label),
  );
  button.addEventListener('click', onClick);
  return button;
}

/** The Field Journal, Achievements and History tiles, icon over label (start and results screens). */
export function collectionLinks(actions: CollectionLinks): HTMLElement {
  return h(
    'div',
    { class: 'tiles collection-links' },
    tile('📖', 'Field Journal', () => actions.journal()),
    tile('🏅', 'Achievements', () => actions.achievements()),
    tile('📅', 'History', () => actions.history()),
  );
}
