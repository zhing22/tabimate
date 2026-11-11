import { countdown } from '../components/countdown';
import { teamCard, type TeamRound } from '../components/teamCard';
import { focus, h } from '../dom';
import type { Interval } from '../frames';
import type { Screen } from '../host';

export interface ResultsProps {
  readonly rounds: readonly TeamRound[];
  readonly score: number;
  readonly biomeName: string;
  readonly streak: number;
  readonly bestStreak: number;
  readonly msUntilNext: () => number;
  readonly interval?: Interval;
}

export interface ResultsActions {
  /** The next puzzle is out: load it. */
  next(): void;
}

export const resultsScreen: Screen<ResultsProps, ResultsActions> = (root, props, actions) => {
  const team = teamCard(props.rounds);
  const nextButton = h(
    'button',
    { class: 'button button--primary', type: 'button', hidden: true },
    "Play today's puzzle",
  );
  nextButton.addEventListener('click', () => actions.next());
  const timer = countdown({
    msLeft: props.msUntilNext,
    onDone: () => (nextButton.hidden = false),
    ...(props.interval ? { interval: props.interval } : {}),
  });
  const heading = h(
    'h1',
    { id: 'results-title', class: 'title title--sm', tabindex: -1 },
    'Journey complete',
  );

  root.append(
    h(
      'section',
      { class: 'card card--journal results', 'aria-labelledby': 'results-title' },
      heading,
      h(
        'p',
        { class: 'results__score' },
        h('span', { class: 'results__number' }, props.score),
        ' points',
      ),
      h('p', { class: 'meta' }, `Reached the ${props.biomeName}`),
      props.streak > 0
        ? h('p', { class: 'meta' }, `🔥 ${props.streak}-day streak · best ${props.bestStreak}`)
        : null,
      h('h2', { class: 'section-title' }, 'Your team'),
      team.el,
      h('p', { class: 'meta next-puzzle' }, 'Next puzzle in ', timer.el),
      nextButton,
    ),
  );
  focus(heading);
  return () => {
    timer.destroy();
    team.destroy();
  };
};
