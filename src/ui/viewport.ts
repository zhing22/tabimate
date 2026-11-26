// What the player can see, as CSS variables on <html>, and the layout's height.
//
// The keyboard never changes the layout. Two kinds of browser:
//  - resizes-content (Chrome on Android, from index.html's viewport meta): the
//    window shrinks above the keyboard;
//  - the rest (iOS Safari): the window stays, the visual viewport shrinks.
// Either way the layout is sized from --app-h, the window's height without a
// keyboard, and --kb-inset is how much of it the keyboard covers. The portrait
// prompt card is translated up by --kb-inset (shell.css): a transform, so
// nothing re-lays out when the keyboard comes or goes.

/** How much of a layout of `layoutHeight` the keyboard covers (CSS px). */
export function keyboardInset(layoutHeight: number, vvHeight: number, vvTop: number): number {
  return Math.max(0, Math.round(layoutHeight - vvHeight - vvTop));
}

interface Held {
  width: number;
  height: number;
}
const held = new WeakMap<Window, Held>();

/** A phone or tablet: the only kind of device with an on-screen keyboard. */
const touchScreen = (win: Window) => win.matchMedia?.('(pointer: coarse)').matches ?? false;

/**
 * The layout's height: the window's, except that on a touch screen a window
 * that only got shorter at the same width is a keyboard (resizes-content), so
 * the tallest height seen at this width holds. A new width (a rotation) starts
 * over. Without touch the window's height is taken as it is.
 */
export function appHeight(win: Window = window): number {
  const last = held.get(win);
  const next =
    last && touchScreen(win) && last.width === win.innerWidth
      ? { width: last.width, height: Math.max(last.height, win.innerHeight) }
      : { width: win.innerWidth, height: win.innerHeight };
  held.set(win, next);
  return next.height;
}

/** The keyboard's cover now (0 without a visual viewport). */
export function currentKeyboardInset(win: Window = window): number {
  const vv = win.visualViewport;
  return vv ? keyboardInset(appHeight(win), vv.height, vv.offsetTop) : 0;
}

/**
 * Keeps --app-h, --kb-inset, --vv-height and --vv-top current. The landscape
 * panel and full-screen pages fit the visible area (--vv-*); the portrait
 * sheet keeps --app-h and moves by --kb-inset.
 */
export function watchViewport(win: Window = window): () => void {
  const root = win.document.documentElement;
  const update = () => {
    const vv = win.visualViewport;
    const height = appHeight(win);
    root.style.setProperty('--app-h', `${height}px`);
    root.style.setProperty('--vv-height', `${vv?.height ?? height}px`);
    root.style.setProperty('--vv-top', `${vv?.offsetTop ?? 0}px`);
    root.style.setProperty('--kb-inset', `${currentKeyboardInset(win)}px`);
    // Whole device pixels for UI sprites (components.css --px); changes with page zoom.
    root.style.setProperty('--dpr', String(win.devicePixelRatio || 1));
  };
  update();
  const vv = win.visualViewport;
  win.addEventListener('resize', update);
  vv?.addEventListener('resize', update);
  vv?.addEventListener('scroll', update);
  return () => {
    win.removeEventListener('resize', update);
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
  };
}
