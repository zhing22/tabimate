import { countdown } from '../components/countdown';
import { teamCard, type TeamRound } from '../components/teamCard';
import { focus, h } from '../dom';
import type { Delay } from '../frames';
import type { Screen } from '../host';

export interface ResultsProps {
  readonly rounds: readonly TeamRound[];
  readonly score: number;
  readonly biomeName: string;
  readonly streak: number;
  readonly bestStreak: number;
  readonly msUntilNext: () => number;
  readonly delay?: Delay;
}

/** How a share went (services/share.ts ShareOutcome). */
export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ResultsActions {
  /** The next puzzle is out: load it. */
  next(): void;
  /** Shares (or copies) the run's share text. */
  share(): Promise<ShareResult>;
}

const SHARE_LABEL = 'Share';
const SAID: Readonly<Record<ShareResult, string>> = {
  shared: 'Shared!',
  copied: 'Copied!',
  cancelled: SHARE_LABEL,
  failed: "Couldn't copy",
};
const SAID_MS = 2_000;

/** The Share button: says how it went for a moment, and tells screen readers too. */
function shareButton(onShare: () => Promise<ShareResult>) {
  const button = h('button', { class: 'button button--primary', type: 'button' }, SHARE_LABEL);
  const status = h('p', { class: 'sr-only', role: 'status' });
  let reset: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener('click', () => {
    void onShare().then((result) => {
      button.textContent = SAID[result];
      status.textContent = result === 'cancelled' ? '' : SAID[result];
      clearTimeout(reset);
      reset = setTimeout(() => (button.textContent = SHARE_LABEL), SAID_MS);
    });
  });
  return {
    el: h('div', { class: 'results__share' }, button, status),
    destroy: () => clearTimeout(reset),
  };
}

export const resultsScreen: Screen<ResultsProps, ResultsActions> = (root, props, actions) => {
  const team = teamCard(props.rounds);
  const shareIt = shareButton(() => actions.share());
  const nextButton = h(
    'button',
    { class: 'button button--primary', type: 'button', hidden: true },
    "Play today's puzzle",
  );
  nextButton.addEventListener('click', () => actions.next());
  const timer = countdown({
    msLeft: props.msUntilNext,
    onDone: () => (nextButton.hidden = false),
    ...(props.delay ? { delay: props.delay } : {}),
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
      shareIt.el,
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
    shareIt.destroy();
  };
};
