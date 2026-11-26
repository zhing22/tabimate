// The screen layout (base.css reads what this sets on <html>): portrait or
// landscape from the window's shape, and the sizes from config/layout.ts.
import { KEYBOARD, PANEL_WIDTH_CSS, PORTRAIT } from '@/config/layout';
import { layoutMode, type LayoutMode } from '@/core/layout';
import { appHeight, currentKeyboardInset } from '../viewport';

/** On <html> while a full-screen page shows (portrait: it covers the stage). */
export const PAGE_CLASS = 'is-page';

/**
 * Whether the scene is out of sight: in portrait a full-screen page covers
 * the stage, and the keyboard lifts the prompt card over most of it. (In
 * landscape the scene is always beside the panel.)
 */
export function sceneHidden(doc: Document = document): boolean {
  const win = doc.defaultView;
  return (
    currentLayout(doc) === 'portrait' &&
    (doc.documentElement.classList.contains(PAGE_CLASS) ||
      (win !== null && currentKeyboardInset(win) > 0))
  );
}

/** Whether a pop-up page (Journal, Achievements, History, Results) is open, in either layout. */
export function pageOpen(doc: Document = document): boolean {
  return doc.documentElement.classList.contains(PAGE_CLASS);
}

/** The layout in force, from <html data-layout> (portrait until the shell starts). */
export function currentLayout(doc: Document = document): LayoutMode {
  return doc.documentElement.dataset['layout'] === 'landscape' ? 'landscape' : 'portrait';
}

/**
 * Starts the layout: sets the size properties once and html[data-layout],
 * kept current on resize. The shape comes from appHeight (ui/viewport.ts),
 * which a keyboard never shrinks, so typing can't flip it to landscape.
 */
export function startLayout(win: Window = window): () => void {
  const root = win.document.documentElement;
  root.style.setProperty('--panel-w', PANEL_WIDTH_CSS);
  root.style.setProperty('--stage-share', String(PORTRAIT.stageShare * 100));
  root.style.setProperty('--sheet-max', `${PORTRAIT.sheetMaxPx}px`);
  root.style.setProperty('--card-rise-ms', `${KEYBOARD.cardRiseMs}ms`);
  root.style.setProperty('--kb-expected', String(KEYBOARD.expectedShare));
  const update = () => {
    root.dataset['layout'] = layoutMode(win.innerWidth, appHeight(win));
  };
  update();
  win.addEventListener('resize', update);
  return () => win.removeEventListener('resize', update);
}
