import { h } from '../dom';
import { formatCountdown } from '../format';
import { browserDelay, type Delay } from '../frames';
import type { Component } from './component';

export interface CountdownProps {
  /** Milliseconds left right now. */
  readonly msLeft: () => number;
  /** Called once when it reaches zero. */
  readonly onDone?: () => void;
  readonly delay?: Delay;
}

/**
 * "HH:MM:SS" until something happens, e.g. the next puzzle. Each update is
 * scheduled for the moment the shown second changes (not once a second from
 * whenever the screen opened), so it reads 00:00:00 exactly at the target.
 */
export function countdown(props: CountdownProps): Component {
  const el = h('time', { class: 'countdown' });
  const delay = props.delay ?? browserDelay;
  let cancel = () => {};
  const tick = () => {
    const left = props.msLeft();
    el.textContent = formatCountdown(left);
    if (left <= 0) {
      props.onDone?.();
      return;
    }
    // The display rounds up, so it changes when `left` crosses a whole second.
    cancel = delay(tick, left % 1000 || 1000);
  };
  tick();
  return { el, destroy: () => cancel() };
}
