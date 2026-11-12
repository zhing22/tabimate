import { h, svg } from '../dom';
import { secondsLeft } from '../format';
import { animationFrames, type FrameLoop } from '../frames';
import type { Component } from './component';

export interface TimerRingProps {
  /** When the round ends, epoch ms (same clock as `now`). */
  readonly endsAt: number;
  readonly totalMs: number;
  readonly now: () => number;
  /** Below this many seconds the ring turns urgent. */
  readonly warnAtS?: number;
  readonly frames?: FrameLoop;
}

const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular countdown. Drawn from endsAt each frame rather than counting down
 * itself, so it stays right after a reload or a throttled background tab.
 */
export interface TimerRing extends Component {
  /** Points at a new deadline and (re)starts the countdown. */
  setEndsAt(endsAt: number): void;
  /**
   * Holds the ring at what it shows now. Used while a reveal is up: a ring
   * running out behind the result would look like a timeout.
   */
  freeze(): void;
}

export function timerRing(props: TimerRingProps): TimerRing {
  const frames = props.frames ?? animationFrames;
  const warnAt = props.warnAtS ?? 5;
  let endsAt = props.endsAt;

  const arc = svg('circle', {
    class: 'timer-ring__arc',
    cx: 32,
    cy: 32,
    r: RADIUS,
    'stroke-dasharray': CIRCUMFERENCE.toFixed(2),
  });
  const label = h('span', { class: 'timer-ring__label' });
  // role=timer is not announced on every change, which is what we want.
  const el = h(
    'div',
    { class: 'timer-ring', role: 'timer', 'aria-label': 'Time left' },
    svg(
      'svg',
      { viewBox: '0 0 64 64', 'aria-hidden': 'true' },
      svg('circle', { class: 'timer-ring__track', cx: 32, cy: 32, r: RADIUS }),
      arc,
    ),
    label,
  );

  let shown = -1;
  const draw = () => {
    const left = Math.max(0, endsAt - props.now());
    const fraction = props.totalMs > 0 ? Math.min(1, left / props.totalMs) : 0;
    arc.setAttribute('stroke-dashoffset', (CIRCUMFERENCE * (1 - fraction)).toFixed(2));
    const seconds = secondsLeft(left);
    if (seconds !== shown) {
      shown = seconds;
      label.textContent = String(seconds);
      el.setAttribute('aria-label', `${seconds} seconds left`);
      el.classList.toggle('timer-ring--low', seconds <= warnAt);
    }
  };

  let stop: (() => void) | null = null;
  const halt = () => {
    stop?.();
    stop = null;
  };

  draw();
  stop = frames(draw);
  return {
    el,
    setEndsAt(next) {
      endsAt = next;
      shown = -1;
      draw();
      stop ??= frames(draw);
    },
    freeze() {
      draw();
      halt();
    },
    destroy: halt,
  };
}
