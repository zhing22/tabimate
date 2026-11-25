import { card } from '../components/card';
import { countdown } from '../components/countdown';
import { focus, h } from '../dom';
import type { Delay } from '../frames';
import type { Screen } from '../host';

export interface NoPuzzleProps {
  readonly msUntilNext: () => number;
  readonly delay?: Delay;
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
    ...(props.delay ? { delay: props.delay } : {}),
  });
  const heading = h(
    'h1',
    { id: 'message-title', class: 'title title--sm', tabindex: -1 },
    'No journey today',
  );
  const shown = card({
    className: 'card--journal',
    title: heading,
    body: [h('p', {}, "Today's puzzle isn't ready yet. The next one starts in ", timer.el, '.')],
    footer: [button],
  });
  shown.el.setAttribute('role', 'status');
  root.append(shown.el);
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
  const heading = h(
    'h1',
    { id: 'message-title', class: 'title title--sm', tabindex: -1 },
    'Lost the trail',
  );
  const shown = card({
    className: 'card--journal',
    title: heading,
    body: [
      h('p', {}, 'Something went wrong while loading the journey.'),
      h('p', { class: 'meta error__detail' }, props.message),
    ],
    footer: [button],
  });
  shown.el.setAttribute('role', 'alert');
  root.append(shown.el);
  focus(button);
  return () => {};
};
