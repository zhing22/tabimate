import { card } from '../components/card';
import { collectionLinks, type CollectionLinks } from '../components/collectionLinks';
import { settingsMenu, type SoundSetting } from '../components/settingsMenu';
import { focus, h } from '../dom';
import type { Screen } from '../host';

export interface ResultsSummaryProps {
  readonly score: number;
  readonly biomeName: string;
  readonly sound?: SoundSetting | undefined;
}

export interface ResultsSummaryActions extends CollectionLinks {
  /** Opens the full results again. */
  open(): void;
}

/**
 * What the sheet shows once the results pop-up is closed (portrait): the
 * score and where the run ended, under the scene, with the way back to the
 * full results and the collection tiles.
 */
export const resultsSummaryScreen: Screen<ResultsSummaryProps, ResultsSummaryActions> = (
  root,
  props,
  actions,
) => {
  const open = h('button', { class: 'button button--primary', type: 'button' }, 'See results');
  open.addEventListener('click', () => actions.open());
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
    ],
    footer: [open],
  });
  root.append(shown.el);
  focus(open);
  return () => settings?.destroy();
};
