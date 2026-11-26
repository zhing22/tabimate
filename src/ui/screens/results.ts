import type { InstallOffer } from '@/core/install';
import type { Backdrops, Portraits } from '@/core/portrait';
import type { ShareOutcome } from '@/core/share';
import type { DayStats } from '@/core/stats';
import { card } from '../components/card';
import { collectionLinks, type CollectionLinks } from '../components/collectionLinks';
import { countdown } from '../components/countdown';
import { lazyInstallHint } from '../components/lazyInstallHint';
import { partyLineup } from '../components/partyLineup';
import { shareButton } from '../components/shareButton';
import { teamCard, type TeamRound } from '../components/teamCard';
import { focus, h } from '../dom';
import { browserDelay, type Delay } from '../frames';
import type { Screen } from '../host';
import { openPage } from '../layout/page';

export interface ResultsProps {
  readonly rounds: readonly TeamRound[];
  /** Players' picks for the day, when the server has them (the shares show once it settles). */
  readonly dayStats?: Promise<DayStats | null> | undefined;
  /** The day total, after any bonus. */
  readonly score: number;
  /** The answers' points alone: where the walk ended (the line-up's scenery). */
  readonly base: number;
  /** "Base 540 ×1.2 = 648" on a bonus quiz day, else null. */
  readonly bonusLine: string | null;
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
  /** Closes the pop-up (portrait): the scene and a short summary show instead. */
  close(): void;
  /** The next puzzle is out: load it. */
  next(): void;
  /** Shares (or copies) the run's share text, with the team image where it can. */
  share(): Promise<ShareOutcome>;
  /** Saves the team image as a file; absent where no image can be made. */
  saveImage?: (() => void) | undefined;
}

export { SAID_MS } from '../components/shareButton';

/**
 * The run's results, a full-screen page (portrait: over the stage; landscape:
 * in the panel). It opens with a compact line-up of the party where the run
 * ended, then the score, the collection tiles and the team; Share is in the
 * footer.
 */
export const resultsScreen: Screen<ResultsProps, ResultsActions> = (root, props, actions) => {
  const team = teamCard(props.rounds, props.portraits);
  let open = true;
  void props.dayStats?.then((stats) => {
    if (open && stats) team.showShares(stats);
  });
  const party = partyLineup(props.rounds, {
    portraits: props.portraits,
    backdrops: props.backdrops,
    score: props.base,
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

  const shown = card({
    className: 'card--journal results',
    title: heading,
    back: () => actions.close(),
    footer: [shareIt.el, saveButton, nextButton],
    body: [
      party.el,
      h(
        'p',
        { class: 'results__score' },
        h('span', { class: 'results__number' }, props.score),
        ' points',
      ),
      props.bonusLine ? h('p', { class: 'meta results__bonus' }, props.bonusLine) : null,
      h(
        'div',
        { class: 'results__stats' },
        h('p', { class: 'meta' }, `Reached the ${props.biomeName}`),
        props.streak > 0
          ? h('p', { class: 'meta' }, `🔥 ${props.streak}-day streak · best ${props.bestStreak}`)
          : null,
      ),
      collectionLinks(actions),
      lazyInstallHint(props.install),
      h('h2', { class: 'section-title' }, 'Your team'),
      team.el,
      h('p', { class: 'meta next-puzzle' }, 'Next puzzle in ', timer.el),
      props.tomorrowTheme
        ? h('p', { class: 'meta tomorrow' }, 'Tomorrow: ', h('strong', {}, props.tomorrowTheme))
        : null,
    ],
  });
  root.append(shown.el);
  const closePage = openPage(shown.el, () => actions.close());
  focus(heading);
  return () => {
    open = false;
    closePage();
    timer.destroy();
    team.destroy();
    party.destroy();
    shareIt.destroy();
  };
};
