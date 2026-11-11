export type Child = Node | string | number | null | undefined | false;
export type Attrs = Record<string, string | number | boolean | null | undefined>;

function apply(el: Element, attrs: Attrs, children: Child[]) {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === true) el.setAttribute(name, '');
    else if (value !== false && value !== null && value !== undefined) {
      el.setAttribute(name, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    // Strings become text nodes, never HTML, so player input can't inject markup.
    el.append(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

/** Creates an HTML element: h('button', { type: 'submit' }, 'Go'). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  apply(el, attrs, children);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Creates an SVG element. */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  apply(el, attrs, children);
  return el;
}

/** Moves focus without scrolling the page (the overlay is already in view). */
export const focus = (el: HTMLElement | null | undefined): void =>
  el?.focus({ preventScroll: true });
