import { countdown } from '../components/countdown';
import { focus, h } from '../dom';
import type { Interval } from '../frames';
import type { Screen } from '../host';

export interface NoPuzzleProps {
  readonly msUntilNext: () => number;
  readonly interval?: Interval;
}

export interface ReloadActions {
  reload(): void;
}

/** No puzzle file for today: say when to come back, and offer a reload once it's time. */
export const noPuzzleScreen: Screen<NoPuzzleProps, ReloadActions> = (root, props, actions) => {
  const button = h('button', { class: 'button', type: 'button' }, 'Check again');
  button.addEventListener('click', () => actions.reload());
  const timer = countdown({
    msLeft: props.msUntilNext,
    onDone: () => actions.reload(),
    ...(props.interval ? { interval: props.interval } : {}),
  });
  const heading = h('h1', { class: 'title title--sm', tabindex: -1 }, 'No journey today');
  root.append(
    h(
      'section',
      { class: 'card card--journal', role: 'status' },
      heading,
      h('p', {}, "Today's puzzle isn't ready yet. The next one starts in ", timer.el, '.'),
      button,
    ),
  );
  focus(heading);
  return () => timer.destroy();
};

export interface ErrorProps {
  readonly message: string;
}

/** Something failed (usually loading). Shows what, and lets the player try again. */
export const errorScreen: Screen<ErrorProps, ReloadActions> = (root, props, actions) => {
  const button = h('button', { class: 'button button--primary', type: 'button' }, 'Try again');
  button.addEventListener('click', () => actions.reload());
  const heading = h('h1', { class: 'title title--sm', tabindex: -1 }, 'Lost the trail');
  root.append(
    h(
      'section',
      { class: 'card card--journal', role: 'alert' },
      heading,
      h('p', {}, 'Something went wrong while loading the journey.'),
      h('p', { class: 'meta error__detail' }, props.message),
      button,
    ),
  );
  focus(button);
  return () => {};
};
