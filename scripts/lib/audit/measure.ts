/// <reference lib="dom" />
// Runs inside the page (page.evaluate), so it uses the DOM; it must not close
// over anything outside itself. The audit thresholds come in as arguments.

export interface Measured {
  /** Smallest font size (CSS px) of any visible text. */
  readonly minTextPx: number;
  /** Visible text elements under the body-text minimum, with a sample of what they say. */
  readonly smallText: number;
  readonly smallTextSamples: readonly string[];
  /** Visible controls smaller than the tap-target minimum either way. */
  readonly smallTargets: readonly string[];
  /** The page scrolls sideways. */
  readonly sidewaysScroll: boolean;
}

export function measurePage(limits: { textPx: number; targetPx: number }): Measured {
  const inView = (r: DOMRect) =>
    r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0;
  const shown = (el: Element) => {
    const style = getComputedStyle(el);
    return style.visibility !== 'hidden' && style.opacity !== '0' && style.display !== 'none';
  };
  const textEls = [...document.querySelectorAll('body *')].filter(
    (el) =>
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()) &&
      shown(el) &&
      inView(el.getBoundingClientRect()) &&
      !el.closest('.debug, [aria-hidden="true"]'),
  );
  const sizes = textEls.map((el) => parseFloat(getComputedStyle(el).fontSize));
  const small = textEls.filter((_, i) => (sizes[i] ?? 0) < limits.textPx);
  const name = (el: Element) =>
    `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent ?? '').trim().slice(0, 24)}"`;
  const controls = [
    ...document.querySelectorAll('button, a[href], input, summary, [role="tab"], [tabindex="0"]'),
  ].filter((el) => shown(el) && inView(el.getBoundingClientRect()) && !el.closest('.debug'));
  const smallTargets = controls
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return Math.min(r.width, r.height) < limits.targetPx;
    })
    .map(name);
  return {
    minTextPx: sizes.length ? Math.min(...sizes) : 0,
    smallText: small.length,
    smallTextSamples: [...new Set(small.map(name))].slice(0, 6),
    smallTargets: [...new Set(smallTargets)],
    sidewaysScroll: document.documentElement.scrollWidth > innerWidth + 1,
  };
}
