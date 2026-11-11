import { h } from '../dom';
import { formatCountdown } from '../format';
import { browserInterval, type Interval } from '../frames';
import type { Component } from './component';

export interface CountdownProps {
  /** Milliseconds left right now; asked again every second. */
  readonly msLeft: () => number;
  /** Called once when it reaches zero. */
  readonly onDone?: () => void;
  readonly interval?: Interval;
}

/** "HH:MM:SS" until something happens, e.g. the next puzzle. */
export function countdown(props: CountdownProps): Component {
  const el = h('time', { class: 'countdown' });
  let done = false;
  let stop = () => {};
  const tick = () => {
    const left = props.msLeft();
    el.textContent = formatCountdown(left);
    if (left <= 0 && !done) {
      done = true;
      stop();
      props.onDone?.();
    }
  };
  tick();
  if (!done) stop = (props.interval ?? browserInterval)(tick, 1000);
  return { el, destroy: () => stop() };
}
