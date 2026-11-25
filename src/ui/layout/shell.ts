// The screen layout (base.css reads what this sets on <html>): portrait or
// landscape from the window's shape, and the sizes from config/layout.ts.
import { KEYBOARD, PANEL_WIDTH_CSS, PORTRAIT } from '@/config/layout';
import { layoutMode, type LayoutMode } from '@/core/layout';

/** On <html> while the answer box has focus (portrait: the sheet rises over the keyboard). */
export const TYPING_CLASS = 'is-typing';

/** What typing holds still on <html> (shell.css reads them). */
const HELD = ['--typing-sheet-h', '--typing-stage-h', '--root-size'] as const;

/** On <html> while a full-screen page shows (portrait: it covers the stage). */
export const PAGE_CLASS = 'is-page';

/**
 * Typing starts or stops. In portrait the prompt card must stay exactly as it
 * was while the keyboard is up, so the sheet's and stage's heights and the
 * root text size (it has vh in it) are measured now and held in px: a
 * keyboard that shrinks the window then changes nothing but where the sheet
 * sits (shell.css lifts it to the keyboard's top).
 */
export function setTyping(on: boolean, doc: Document = document): void {
  const root = doc.documentElement;
  if (on && !root.classList.contains(TYPING_CLASS) && currentLayout(doc) === 'portrait') {
    const height = (selector: string) =>
      doc.querySelector(selector)?.getBoundingClientRect().height;
    const sheet = height('#ui');
    const stage = height('#scene');
    const win = doc.defaultView;
    if (sheet) root.style.setProperty(HELD[0], `${sheet}px`);
    if (stage) root.style.setProperty(HELD[1], `${stage}px`);
    if (win) root.style.setProperty(HELD[2], win.getComputedStyle(root).fontSize);
  }
  if (!on) HELD.forEach((name) => root.style.removeProperty(name));
  root.classList.toggle(TYPING_CLASS, on);
}

/**
 * Whether the scene is out of sight: in portrait a full-screen page covers
 * the stage, and while typing the sheet rises over most of it. (In landscape
 * the scene is always beside the panel.)
 */
export function sceneHidden(doc: Document = document): boolean {
  const classes = doc.documentElement.classList;
  return (
    currentLayout(doc) === 'portrait' &&
    (classes.contains(PAGE_CLASS) || classes.contains(TYPING_CLASS))
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
 * kept current on resize. While the player types, the layout is held: a
 * phone keyboard shrinks the window, and that must not flip it to landscape.
 */
export function startLayout(win: Window = window): () => void {
  const root = win.document.documentElement;
  root.style.setProperty('--panel-w', PANEL_WIDTH_CSS);
  root.style.setProperty('--stage-share', String(PORTRAIT.stageShare * 100));
  root.style.setProperty('--sheet-max', `${PORTRAIT.sheetMaxPx}px`);
  root.style.setProperty('--sheet-rise-ms', `${KEYBOARD.sheetRiseMs}ms`);
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
