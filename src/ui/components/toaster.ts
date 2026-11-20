import { TOAST } from '@/config/collection';
import { h } from '../dom';
import { browserDelay, type Delay } from '../frames';

export interface ToastContent {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

export interface Toaster {
  /** Queues a toast: each shows for TOAST.showMs, one after another. */
  show(content: ToastContent): void;
  destroy(): void;
}

/**
 * Small notes at the top of the screen (an achievement, new journal animals)
 * that never take focus or block a tap. `layer` is the host's toast layer,
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
      h(
        'div',
        { class: 'toast' },
        h('span', { class: 'toast__icon', 'aria-hidden': 'true' }, content.icon),
        h(
          'span',
          { class: 'toast__body' },
          h('strong', { class: 'toast__title' }, content.title),
          h('span', { class: 'toast__text' }, content.text),
        ),
      ),
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
