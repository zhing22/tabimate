import type { Backdrops, Portraits } from '@/core/portrait';
import type { ShareOutcome } from '@/core/share';
import { countdown } from '../components/countdown';
import { partyLineup } from '../components/partyLineup';
import { teamCard, type TeamRound } from '../components/teamCard';
import { focus, h } from '../dom';
import { browserDelay, type Delay } from '../frames';
import type { Screen } from '../host';

export interface ResultsProps {
  readonly rounds: readonly TeamRound[];
  readonly score: number;
  readonly biomeName: string;
  readonly streak: number;
  readonly bestStreak: number;
  readonly msUntilNext: () => number;
  readonly delay?: Delay;
  /** Sprite pictures for the line-up and team list; emoji without. */
  readonly portraits?: Portraits;
  readonly backdrops?: Backdrops;
}

export interface ResultsActions {
  /** The next puzzle is out: load it. */
  next(): void;
  /** Shares (or copies) the run's share text. */
  share(): Promise<ShareOutcome>;
  /** Opens the Field Journal. */
  journal(): void;
}

const SHARE_LABEL = 'Share';
const SAID: Readonly<Record<ShareOutcome, string>> = {
  shared: 'Shared!',
  copied: 'Copied!',
  cancelled: SHARE_LABEL,
  failed: "Couldn't copy",
};
/** On <html> while the results show (base.css: no phone split-screen). */
export const RESULTS_CLASS = 'is-results';

/** How long the button says "Copied!" before it reads "Share" again. */
export const SAID_MS = 2_000;

/**
 * The Share button: says how it went for a moment, and tells screen readers.
 * Taps while a share is still going are ignored: a second navigator.share()
 * with the sheet open fails, falls back to copying, and would say "Copied!"
 * while the sheet is still up.
 */
function shareButton(onShare: () => Promise<ShareOutcome>, delay: Delay) {
  const button = h('button', { class: 'button button--primary', type: 'button' }, SHARE_LABEL);
  const status = h('p', { class: 'sr-only', role: 'status' });
  let busy = false;
  let cancelReset = () => {};
  button.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    button.setAttribute('aria-busy', 'true');
    void onShare().then((result) => {
      busy = false;
      button.removeAttribute('aria-busy');
      button.textContent = SAID[result];
      // Cleared, then set on a microtask: the same "Copied!" twice is still a
      // change, so a screen reader reads it out again.
      status.textContent = '';
      if (result !== 'cancelled') queueMicrotask(() => (status.textContent = SAID[result]));
      cancelReset();
      cancelReset = delay(() => (button.textContent = SHARE_LABEL), SAID_MS);
    });
  });
  return {
    el: h('div', { class: 'results__share' }, button, status),
    destroy: () => cancelReset(),
  };
}

export const resultsScreen: Screen<ResultsProps, ResultsActions> = (root, props, actions) => {
  const team = teamCard(props.rounds, props.portraits);
  const party = partyLineup(props.rounds, {
    portraits: props.portraits,
    backdrops: props.backdrops,
    score: props.score,
  });
  const shareIt = shareButton(() => actions.share(), props.delay ?? browserDelay);
  const nextButton = h(
    'button',
    { class: 'button button--primary', type: 'button', hidden: true },
    "Play today's puzzle",
  );
  nextButton.addEventListener('click', () => actions.next());
  const journalButton = h('button', { class: 'button', type: 'button' }, 'Field Journal');
  journalButton.addEventListener('click', () => actions.journal());
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
      party.el,
      h(
        'div',
        { class: 'results__stats' },
        h('p', { class: 'meta' }, `Reached the ${props.biomeName}`),
        props.streak > 0
          ? h('p', { class: 'meta' }, `🔥 ${props.streak}-day streak · best ${props.bestStreak}`)
          : null,
      ),
      h('div', { class: 'results__actions' }, shareIt.el, journalButton),
      h('h2', { class: 'section-title' }, 'Your team'),
      team.el,
      h('p', { class: 'meta next-puzzle' }, 'Next puzzle in ', timer.el),
      nextButton,
    ),
  );
  focus(heading);
  // Lets the layout show the scene full-window behind this card on phones too.
  document.documentElement.classList.add(RESULTS_CLASS);
  return () => {
    document.documentElement.classList.remove(RESULTS_CLASS);
    timer.destroy();
    team.destroy();
    party.destroy();
    shareIt.destroy();
  };
};
