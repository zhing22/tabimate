import { h, type Child } from '../dom';

export interface CardOptions {
  /** Extra classes: the screen's own name (and card--journal for ruled paper). */
  readonly className: string;
  /** The title element (it names the card); omit for a card without a header title. */
  readonly title?: HTMLElement;
  /** A line under the title ("7 of 550 animals found"). */
  readonly meta?: Child;
  /** "Back" at the header's end: closes the pop-up, back to where it was opened. */
  readonly back?: () => void;
  /** More in the header, before Back: the timer ring, the settings menu. */
  readonly tools?: readonly Child[];
  readonly body: readonly Child[];
  /** Always visible under the body: the screen's main action. */
  readonly footer?: readonly Child[];
  /** Names the card when it has no title (aria-label). */
  readonly label?: string;
  /** Names the card by another element's id instead (the round: its question). */
  readonly labelledBy?: string;
}

export interface Card {
  readonly el: HTMLElement;
  /** The part that scrolls. */
  readonly body: HTMLElement;
  readonly footer: HTMLElement | null;
}

function backButton(onClick: () => void): HTMLButtonElement {
  const button = h('button', { class: 'button card__back', type: 'button' }, '‹ Back');
  button.setAttribute('aria-label', 'Back');
  button.addEventListener('click', onClick);
  return button;
}

function cardHeader(o: CardOptions): HTMLElement | null {
  if (!o.title && !o.back && !o.tools?.length) return null;
  return h(
    'header',
    { class: 'card__header' },
    h(
      'div',
      { class: 'card__title' },
      o.title ?? null,
      o.meta !== undefined ? h('p', { class: 'meta card__meta' }, o.meta) : null,
    ),
    ...(o.tools ?? []),
    o.back ? backButton(o.back) : null,
  );
}

/**
 * Every screen's card (v3 layout): a fixed header (the title and its line on
 * the left; tools and Back on the right), a body that scrolls, and a footer
 * with the main action that never scrolls away. It fills the sheet
 * (portrait), the panel (landscape) or the screen (a full-screen page).
 */
export function card(o: CardOptions): Card {
  const body = h('div', { class: 'card__body' }, ...o.body);
  const footer = o.footer?.length ? h('footer', { class: 'card__footer' }, ...o.footer) : null;
  const labelledBy = o.labelledBy ?? o.title?.id;
  const named = labelledBy
    ? { 'aria-labelledby': labelledBy }
    : o.label
      ? { 'aria-label': o.label }
      : {};
  const header = cardHeader(o);
  const el = h('section', { class: `card ${o.className}`, ...named }, header, body, footer);
  return { el, body, footer };
}
