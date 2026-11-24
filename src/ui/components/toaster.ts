import { TOAST } from '@/config/collection';
import { h } from '../dom';
import { browserDelay, type Delay } from '../frames';

export interface ToastContent {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
  /** Tapping it does this (an achievement's opens the Achievements page at it). */
  readonly open?: (() => void) | undefined;
  /** What the tap does, for screen readers: "Open achievements". */
  readonly openLabel?: string | undefined;
}

export interface Toaster {
  /** Queues a toast: each shows for TOAST.showMs, one after another. */
  show(content: ToastContent): void;
  destroy(): void;
}

/**
 * A toast: a quiet note, or (with `open`) a button that does something and
 * then gives way to the next toast.
 */
function toastEl(content: ToastContent, done: () => void): HTMLElement {
  const body = [
    h('span', { class: 'toast__icon', 'aria-hidden': 'true' }, content.icon),
    h(
      'span',
      { class: 'toast__body' },
      h('strong', { class: 'toast__title' }, content.title),
      h('span', { class: 'toast__text' }, content.text),
      content.openLabel ? h('span', { class: 'sr-only' }, ` ${content.openLabel}`) : null,
    ),
  ];
  const { open } = content;
  if (!open) return h('div', { class: 'toast' }, ...body);
  const button = h('button', { class: 'toast toast--action', type: 'button' }, ...body);
  button.addEventListener('click', () => {
    done();
    open();
  });
  return button;
}

/**
 * Small notes at the top of the screen (an achievement, new journal animals)
 * that never take focus, and block a tap only when they can be tapped. `layer` is the host's toast layer,
 * which outlives screens, and is a polite live region, so each is read once.
 */
export function createToaster(layer: HTMLElement, delay: Delay = browserDelay): Toaster {
  const queue: ToastContent[] = [];
  let cancel: (() => void) | null = null;

  function showNext() {
    layer.replaceChildren();
    cancel = null;
    const content = queue.shift();
    if (!content) return;
    layer.append(
      toastEl(content, () => {
        cancel?.();
        showNext();
      }),
    );
    cancel = delay(showNext, TOAST.showMs);
  }

  return {
    show(content) {
      queue.push(content);
      if (!cancel) showNext();
    },
    destroy() {
      cancel?.();
      queue.length = 0;
      layer.replaceChildren();
    },
  };
}
