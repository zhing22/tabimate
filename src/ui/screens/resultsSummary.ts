import { isShiny } from '@/config/levels';
import { UI_SPRITE_SCALE } from '@/config/ui';
import type { Portraits } from '@/core/portrait';
import type { ShareOutcome } from '@/core/share';
import { card } from '../components/card';
import { collectionLinks, type CollectionLinks } from '../components/collectionLinks';
import { portrait } from '../components/portrait';
import { settingsMenu, type SoundSetting } from '../components/settingsMenu';
import { shareButton } from '../components/shareButton';
import type { TeamRound } from '../components/teamCard';
import { focus, h } from '../dom';
import { browserDelay, type Delay } from '../frames';
import type { Screen } from '../host';

export interface ResultsSummaryProps {
  readonly score: number;
  readonly biomeName: string;
  /** The day's answers: the compact team row shows each found animal. */
  readonly rounds: readonly TeamRound[];
  readonly portraits?: Portraits | undefined;
  readonly sound?: SoundSetting | undefined;
  readonly delay?: Delay | undefined;
}

export interface ResultsSummaryActions extends CollectionLinks {
  /** Opens the full results again. */
  open(): void;
  share(): Promise<ShareOutcome>;
}

/**
 * The team in one row: a slot per prompt, in order, each found animal's
 * picture (a miss leaves its slot empty). The slots share the width equally
 * and shrink together (results.css), so it never wraps.
 */
function teamRow(props: ResultsSummaryProps): HTMLElement {
  const found = props.rounds.filter((r) => r.animal !== null);
  const row = h(
    'p',
    { class: 'summary-team', 'aria-label': found.map((r) => r.animal?.display).join(', ') },
    ...props.rounds.map((r) =>
      h(
        'span',
        { class: 'summary-team__slot' },
        r.animal
          ? portrait(r.animal, isShiny(r.result.match.level), {
              scale: UI_SPRITE_SCALE.team,
              portraits: props.portraits,
            })
          : null,
      ),
    ),
  );
  row.style.setProperty('--slots', String(Math.max(1, props.rounds.length)));
  return row;
}

/**
 * What the sheet shows once the results pop-up is closed (portrait): the
 * score and where the run ended under the scene, the team in a row, Share,
 * and the way back to the full results; the collection tiles too.
 */
export const resultsSummaryScreen: Screen<ResultsSummaryProps, ResultsSummaryActions> = (
  root,
  props,
  actions,
) => {
  const open = h('button', { class: 'button', type: 'button' }, 'See results');
  open.addEventListener('click', () => actions.open());
  const share = shareButton(() => actions.share(), props.delay ?? browserDelay);
  const settings = props.sound ? settingsMenu(props.sound) : null;
  const shown = card({
    className: 'card--journal results-summary',
    title: h('h1', { id: 'summary-title', class: 'title title--sm' }, 'Journey complete'),
    tools: [settings?.el],
    body: [
      h(
        'p',
        { class: 'results__score' },
        h('span', { class: 'results__number' }, props.score),
        ' points',
      ),
      h('p', { class: 'meta' }, `Reached the ${props.biomeName}`),
      collectionLinks(actions),
      teamRow(props),
    ],
    footer: [share.el, open],
  });
  root.append(shown.el);
  focus(open);
  return () => {
    share.destroy();
    settings?.destroy();
  };
};
