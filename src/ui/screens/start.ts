import { ANSWER_LEVELS, LEVELS, TOP_LEVEL } from '@/config/levels';
import { h, focus } from '../dom';
import type { Screen } from '../host';

export interface StartProps {
  readonly puzzleNumber: number;
  readonly promptCount: number;
  /** Current streak; 0 hides the line. */
  readonly streak: number;
  /** The day's theme (config/themes.ts), or null on a plain day. */
  readonly theme: { readonly name: string; readonly tagline: string } | null;
}

/** "Rarer answers score more, from LC (10) up to CR (100).", read from LEVELS. */
function scoringLine(): string {
  const low = LEVELS[ANSWER_LEVELS[0] ?? TOP_LEVEL];
  const high = LEVELS[TOP_LEVEL];
  return `Rarer answers score more, from ${low.shortName} (${low.points}) up to ${high.shortName} (${high.points}).`;
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
      props.theme
        ? h(
            'p',
            { class: 'theme' },
            h('strong', { class: 'theme__name' }, props.theme.name),
            h('span', { class: 'theme__tagline' }, props.theme.tagline),
          )
        : null,
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
          h('li', {}, scoringLine()),
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
