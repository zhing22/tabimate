// The screen layout (base.css reads what this sets on <html>): portrait or
// landscape from the window's shape, and the sizes from config/layout.ts.
import { KEYBOARD, PANEL_WIDTH_CSS, PORTRAIT } from '@/config/layout';
import { layoutMode, type LayoutMode } from '@/core/layout';

/** On <html> while the answer box has focus: in portrait the stage slides away. */
export const TYPING_CLASS = 'is-typing';

/** On <html> while a full-screen page shows (portrait: it covers the stage). */
export const PAGE_CLASS = 'is-page';

/**
 * Whether the scene is out of sight: in portrait a full-screen page covers
 * the stage, and while typing the stage slides away. (In landscape the scene
 * is always beside the panel.)
 */
export function sceneHidden(doc: Document = document): boolean {
  const classes = doc.documentElement.classList;
  return (
    currentLayout(doc) === 'portrait' &&
    (classes.contains(PAGE_CLASS) || classes.contains(TYPING_CLASS))
  );
}

/** The layout in force, from <html data-layout> (portrait until the shell starts). */
export function currentLayout(doc: Document = document): LayoutMode {
  return doc.documentElement.dataset['layout'] === 'landscape' ? 'landscape' : 'portrait';
}

/**
 * Starts the layout: sets the size properties once and html[data-layout],
 * kept current on resize. While the player types, the layout is held: a
 * phone keyboard shrinks the window, and that must not flip it to landscape.
 */
export function startLayout(win: Window = window): () => void {
  const root = win.document.documentElement;
  root.style.setProperty('--panel-w', PANEL_WIDTH_CSS);
  root.style.setProperty('--stage-share', String(PORTRAIT.stageShare * 100));
  root.style.setProperty('--sheet-max', `${PORTRAIT.sheetMaxPx}px`);
  root.style.setProperty('--stage-slide-ms', `${KEYBOARD.stageSlideMs}ms`);
  const update = () => {
    if (root.classList.contains(TYPING_CLASS)) return;
    root.dataset['layout'] = layoutMode(win.innerWidth, win.innerHeight);
  };
  // Typing ends on blur, maybe after the window changed shape (a rotation with
  // the keyboard up): catch up then.
  const afterBlur = () => queueMicrotask(update);
  update();
  win.addEventListener('resize', update);
  win.document.addEventListener('focusout', afterBlur);
  return () => {
    win.removeEventListener('resize', update);
    win.document.removeEventListener('focusout', afterBlur);
  };
}
