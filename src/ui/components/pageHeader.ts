import { h } from '../dom';

/**
 * On <html> while a collection page (the Field Journal, Achievements) shows:
 * on a phone it is a card over the full-window scene (base.css, journalPhone.css).
 */
export const COLLECTION_PAGE_CLASS = 'is-collection';

/**
 * A collection page's header: the title and a one-line count on the left,
 * Back on the right, in one compact row so the room goes to the content.
 * `id` names the title, for the page's aria-labelledby; it takes focus as
 * the page opens.
 */
export function pageHeader(id: string, title: string, meta: string, back: () => void) {
  const button = h('button', { class: 'button page-head__back', type: 'button' }, 'Back');
  button.addEventListener('click', back);
  const heading = h('h1', { id, class: 'title title--sm', tabindex: -1 }, title);
  const el = h(
    'div',
    { class: 'page-head' },
    h('div', { class: 'page-head__title' }, heading, h('p', { class: 'meta' }, meta)),
    button,
  );
  return { el, heading };
}
