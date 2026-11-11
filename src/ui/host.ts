import { h } from './dom';

/** Returns the function that removes what was mounted. */
export type Unmount = () => void;

/** The screen contract: draw into root, wire actions, return how to clean up. */
export type Screen<P, A> = (root: HTMLElement, props: P, actions: A) => Unmount;

export interface ScreenHost {
  /** Replaces the current screen (and any overlay). */
  show<P, A>(screen: Screen<P, A>, props: P, actions: A): void;
  /** Mounts something with its own lifecycle as the current screen. */
  showCustom(mount: (root: HTMLElement) => Unmount): void;
  /** Shows a layer above the screen without unmounting it (keeps input focus). */
  showOverlay<P, A>(screen: Screen<P, A>, props: P, actions: A): void;
  clearOverlay(): void;
  /** Says something to screen readers, politely. */
  announce(text: string): void;
  destroy(): void;
}

/**
 * Owns the UI root: one screen at a time, an optional overlay above it, and a
 * live region that outlives screens so announcements are never cut off.
 */
export function createScreenHost(root: HTMLElement): ScreenHost {
  const screenLayer = h('div', { class: 'screen-layer' });
  const overlayLayer = h('div', { class: 'overlay-layer' });
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
  root.replaceChildren(screenLayer, overlayLayer, live);

  let unmountScreen: Unmount | null = null;
  let unmountOverlay: Unmount | null = null;

  const clearOverlay = () => {
    unmountOverlay?.();
    unmountOverlay = null;
    overlayLayer.replaceChildren();
  };
  const clearScreen = () => {
    clearOverlay();
    unmountScreen?.();
    unmountScreen = null;
    screenLayer.replaceChildren();
  };
  const showCustom = (mount: (el: HTMLElement) => Unmount) => {
    clearScreen();
    unmountScreen = mount(screenLayer);
  };

  return {
    show: (screen, props, actions) => showCustom((el) => screen(el, props, actions)),
    showCustom,
    showOverlay(screen, props, actions) {
      clearOverlay();
      unmountOverlay = screen(overlayLayer, props, actions);
    },
    clearOverlay,
    announce(text) {
      // Clearing first makes a repeated message (two misses in a row) be read again.
      live.textContent = '';
      queueMicrotask(() => (live.textContent = text));
    },
    destroy() {
      clearScreen();
      root.replaceChildren();
    },
  };
}
