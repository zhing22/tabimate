import { h } from '../dom';

export interface CollectionLinks {
  journal(): void;
  achievements(): void;
  history(): void;
}

/** The Field Journal, Achievements and History buttons, side by side (start and results screens). */
export function collectionLinks(actions: CollectionLinks): HTMLElement {
  const journal = h('button', { class: 'button', type: 'button' }, 'Field Journal');
  journal.addEventListener('click', () => actions.journal());
  const achievements = h('button', { class: 'button', type: 'button' }, 'Achievements');
  achievements.addEventListener('click', () => actions.achievements());
  const history = h('button', { class: 'button', type: 'button' }, 'History');
  history.addEventListener('click', () => actions.history());
  return h('div', { class: 'button-row collection-links' }, journal, achievements, history);
}
