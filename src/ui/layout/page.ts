// A full-screen page (Journal, Achievements, History, Results): in portrait
// it covers the stage; in landscape it sits in the panel like every screen.
// Either way Escape and the browser's back gesture close it, and in portrait
// Tab keeps focus inside it.
import { currentLayout, PAGE_CLASS } from './shell';

const PAGE_STATE = 'tabimatePage';
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const isPageEntry = (state: unknown) =>
  typeof state === 'object' && state !== null && PAGE_STATE in state;

/** Tab past the last control goes to the first, and Shift+Tab before the first to the last. */
function trapTab(page: HTMLElement, event: KeyboardEvent): void {
  const items = [...page.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest('[hidden], details:not([open]) > :not(summary)'),
  );
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  const active = page.ownerDocument.activeElement;
  const outside = !(active instanceof Node && page.contains(active));
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Makes `page` a full-screen page until the returned function is called.
 * One history entry stands for the pages: a page opened from another
 * replaces it, so the back gesture goes back one page at a time.
 */
export function openPage(page: HTMLElement, back: () => void): () => void {
  const doc = page.ownerDocument;
  const win = doc.defaultView ?? window;
  doc.documentElement.classList.add(PAGE_CLASS);
  const entry = { [PAGE_STATE]: true };
  if (isPageEntry(win.history.state)) win.history.replaceState(entry, '');
  else win.history.pushState(entry, '');

  const onPop = () => back();
  const onKey = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      back();
    } else if (event.key === 'Tab' && currentLayout(doc) === 'portrait') {
      trapTab(page, event);
    }
  };
  win.addEventListener('popstate', onPop);
  doc.addEventListener('keydown', onKey);
  return () => {
    doc.documentElement.classList.remove(PAGE_CLASS);
    win.removeEventListener('popstate', onPop);
    doc.removeEventListener('keydown', onKey);
  };
}
