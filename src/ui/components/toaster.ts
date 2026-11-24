import { TOAST } from '@/config/collection';
import { h } from '../dom';
import { browserDelay, type Delay } from '../frames';

export interface ToastContent {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
  /** Its "Open" button does this (an achievement's opens the Achievements page at it). */
  readonly open?: (() => void) | undefined;
  /** What the button does, for screen readers: "Open achievements". */
  readonly openLabel?: string | undefined;
}

export interface Toaster {
  /** Queues a toast: each shows for TOAST.showMs, one after another. */
  show(content: ToastContent): void;
  destroy(): void;
}

interface Hold {
  /** Pointer over the button, or focus in it: the toast stays. */
  readonly held: () => void;
  readonly released: () => void;
}

/**
 * A small "Open" button, the only part of a toast that takes taps: the rest
 * lets them through to the page under it (a card's top edge, a Back button).
 * While it has focus or the pointer is over it, the toast stays (`hold`).
 */
function openButton(content: ToastContent, open: () => void, done: () => void, hold: Hold) {
  const button = h(
    'button',
    {
      class: 'toast__open',
      type: 'button',
      'aria-label': `${content.openLabel ?? 'Open'}: ${content.title}`,
    },
    'Open',
  );
  button.addEventListener('click', () => {
    done();
    open();
  });
  let pointer = false;
  let focused = false;
  const update = () => (pointer || focused ? hold.held() : hold.released());
  const on = (type: string, flag: (v: boolean) => void, value: boolean) =>
    button.addEventListener(type, () => {
      flag(value);
      update();
    });
  on('pointerenter', (v) => (pointer = v), true);
  on('pointerleave', (v) => (pointer = v), false);
  on('focusin', (v) => (focused = v), true);
  on('focusout', (v) => (focused = v), false);
  return button;
}

/** A toast: a quiet note, with an "Open" button when it can do something. */
function toastEl(content: ToastContent, done: () => void, hold: Hold): HTMLElement {
  const { open } = content;
  return h(
    'div',
    { class: 'toast' },
    h('span', { class: 'toast__icon', 'aria-hidden': 'true' }, content.icon),
    h(
      'span',
      { class: 'toast__body' },
      h('strong', { class: 'toast__title' }, content.title),
      h('span', { class: 'toast__text' }, content.text),
    ),
    open ? openButton(content, open, done, hold) : null,
  );
}

/**
 * Small notes (an achievement, new journal animals) that never take focus on
 * their own. An achievement's has an "Open" button a player can tab or tap
 * to; while it has focus or the pointer is over it the toast stays, then
 * gives TOAST.resumeMs more once both have left. `layer` is the host's toast
 * layer, which outlives screens, and is a polite live region, so each is
 * read once.
 */
export function createToaster(layer: HTMLElement, delay: Delay = browserDelay): Toaster {
  const queue: ToastContent[] = [];
  let cancel: (() => void) | null = null;
  let showing = false;

  const wait = (ms: number) => {
    cancel?.();
    cancel = delay(showNext, ms);
  };
  const hold: Hold = {
    held: () => {
      cancel?.();
      cancel = null;
    },
    released: () => wait(TOAST.resumeMs),
  };

  function showNext() {
    layer.replaceChildren();
    cancel = null;
    const content = queue.shift();
    showing = content !== undefined;
    if (!content) return;
    const done = () => {
      cancel?.();
      showNext();
    };
    layer.append(toastEl(content, done, hold));
    wait(TOAST.showMs);
  }

  return {
    show(content) {
      queue.push(content);
      if (!showing) showNext();
    },
    destroy() {
      cancel?.();
      queue.length = 0;
      showing = false;
      layer.replaceChildren();
    },
  };
}
