import { h, focus } from '../dom';
import type { Screen } from '../host';

export interface StartProps {
  readonly puzzleNumber: number;
  readonly promptCount: number;
  /** Current streak; 0 hides the line. */
  readonly streak: number;
}

export interface StartActions {
  play(): void;
}

export const startScreen: Screen<StartProps, StartActions> = (root, props, actions) => {
  const play = h('button', { class: 'button button--primary', type: 'button' }, 'Play');
  play.addEventListener('click', () => actions.play());

  root.append(
    h(
      'section',
      { class: 'card card--journal', 'aria-labelledby': 'start-title' },
      h('h1', { id: 'start-title', class: 'title' }, 'Tabimate'),
      h('p', { class: 'subtitle' }, 'A daily journey with animal friends'),
      h('p', { class: 'meta' }, `Puzzle #${props.puzzleNumber} · ${props.promptCount} prompts`),
      props.streak > 0 ? h('p', { class: 'meta' }, `🔥 ${props.streak}-day streak`) : null,
      play,
      h(
        'details',
        { class: 'how-to' },
        h('summary', {}, 'How to play'),
        h(
          'ul',
          {},
          h('li', {}, 'Each prompt asks for an animal. Type one before the ring runs out.'),
          h('li', {}, 'Rarer animals score more: tiers follow the IUCN Red List.'),
          h(
            'li',
            {},
            'Close enough? We fix typos and short names for you: press Go again to answer.',
          ),
          h('li', {}, 'Every animal you find joins your trail. One journey a day.'),
        ),
      ),
    ),
  );
  focus(play);
  return () => {};
};
