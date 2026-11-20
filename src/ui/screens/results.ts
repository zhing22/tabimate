import type { InstallOffer } from '@/core/install';
import type { Backdrops, Portraits } from '@/core/portrait';
import type { ShareOutcome } from '@/core/share';
import { collectionLinks, type CollectionLinks } from '../components/collectionLinks';
import { countdown } from '../components/countdown';
import { installHint } from '../components/installHint';
import { partyLineup } from '../components/partyLineup';
import { shareButton } from '../components/shareButton';
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
  /** Tomorrow's theme name (config/themes.ts), or null on a plain day. Never its prompts. */
  readonly tomorrowTheme: string | null;
  readonly install?: InstallOffer | undefined;
}

export interface ResultsActions extends CollectionLinks {
  /** The next puzzle is out: load it. */
  next(): void;
  /** Shares (or copies) the run's share text, with the team image where it can. */
  share(): Promise<ShareOutcome>;
  /** Saves the team image as a file; absent where no image can be made. */
  saveImage?: (() => void) | undefined;
}

/** On <html> while the results show (base.css: no phone split-screen). */
export const RESULTS_CLASS = 'is-results';

export { SAID_MS } from '../components/shareButton';

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
  const saveButton = actions.saveImage
    ? h('button', { class: 'button', type: 'button' }, 'Save image')
    : null;
  const save = actions.saveImage;
  if (saveButton && save) saveButton.addEventListener('click', () => save());
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
      h('div', { class: 'results__actions' }, shareIt.el, saveButton),
      collectionLinks(actions),
      installHint(props.install),
      h('h2', { class: 'section-title' }, 'Your team'),
      team.el,
      h('p', { class: 'meta next-puzzle' }, 'Next puzzle in ', timer.el),
      props.tomorrowTheme
        ? h('p', { class: 'meta tomorrow' }, 'Tomorrow: ', h('strong', {}, props.tomorrowTheme))
        : null,
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
