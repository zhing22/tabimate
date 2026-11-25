import { h } from '../dom';

/** What a full-screen page (Journal, Achievements, History) can do from its header. */
export interface PageActions {
  /** Back, Escape or the back gesture: closes the page, back to where it was opened. */
  close(): void;
}

/**
 * A page's title, which names the page (aria-labelledby) and takes focus as
 * it opens so screen readers start there.
 */
export const pageTitle = (id: string, text: string): HTMLElement =>
  h('h1', { id, class: 'title title--sm', tabindex: -1 }, text);
